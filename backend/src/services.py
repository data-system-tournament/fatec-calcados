"""
Serviços: é AQUI que as regras são aplicadas.

Views, API, admin e o seed chamam estas funções, nunca criam Compra ou
MovimentoPontos na mão. Assim a regra existe num lugar só, e um PDV no
futuro chamaria exatamente as mesmas funções (via API).
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from . import cpf as cpf_utils
from . import regras
from .models import Cliente, Compra, Loja, MovimentoPontos

Tipo = MovimentoPontos.Tipo


class RegraViolada(Exception):
    """Erro de regra de negócio, com mensagem pronta para mostrar ao usuário."""


# ---------------------------------------------------------------- consultas

def saldo(cliente: Cliente, ate=None) -> int:
    movimentos = cliente.movimentos.all()
    if ate is not None:
        movimentos = movimentos.filter(data__lte=ate)
    return movimentos.aggregate(total=Sum("pontos"))["total"] or 0


def pontos_12m(cliente: Cliente, em=None) -> int:
    """Pontos ACUMULADOS nos 12 meses anteriores a `em`. É o que define o nível."""
    em = em or timezone.now()
    return (
        cliente.movimentos.filter(
            tipo=Tipo.ACUMULO, data__gt=em - regras.JANELA_NIVEL, data__lte=em
        ).aggregate(total=Sum("pontos"))["total"]
        or 0
    )


def nivel_atual(cliente: Cliente, em=None) -> str:
    return regras.nivel_por_pontos(pontos_12m(cliente, em))


def pontos_a_vencer(cliente: Cliente, dias=60, em=None):
    """(total de pontos que vencem nos próximos `dias`, data do primeiro vencimento)."""
    em = em or timezone.now()
    lotes = cliente.movimentos.filter(
        tipo=Tipo.ACUMULO,
        restante__gt=0,
        expira_em__gt=em,
        expira_em__lte=em + timezone.timedelta(days=dias),
    ).order_by("expira_em")
    total = sum(l.restante for l in lotes)
    return total, (lotes[0].expira_em if total else None)


# ---------------------------------------------------------------- operações

def cadastrar_cliente(cpf, nome, loja: Loja | None = None, data=None) -> Cliente:
    numero = cpf_utils.limpar(cpf)
    if not cpf_utils.validar(numero):
        raise RegraViolada("CPF inválido. Confira os números.")
    if not nome or not nome.strip():
        raise RegraViolada("Informe o nome do cliente.")
    if Cliente.objects.filter(cpf=numero).exists():
        raise RegraViolada("Esse CPF já está cadastrado.")
    return Cliente.objects.create(
        cpf=numero, nome=nome.strip(), loja_cadastro=loja, cadastrado_em=data or timezone.now()
    )


def expirar_pontos(cliente: Cliente, ate=None) -> int:
    """
    Zera os lotes vencidos até `ate` e registra uma EXPIRACAO para cada um.
    O movimento é datado no dia em que o lote venceu (e não no dia em que
    rodamos a rotina), para o gráfico mensal ficar correto.
    """
    ate = ate or timezone.now()
    vencidos = cliente.movimentos.filter(
        tipo=Tipo.ACUMULO, restante__gt=0, expira_em__lte=ate
    ).order_by("expira_em", "id")
    total = 0
    for lote in vencidos:
        MovimentoPontos.objects.create(
            cliente=cliente, tipo=Tipo.EXPIRACAO, pontos=-lote.restante, data=lote.expira_em
        )
        total += lote.restante
        lote.restante = 0
        lote.save(update_fields=["restante"])
    return total


def _consumir_lotes(cliente: Cliente, pontos: int, em):
    """Resgate FIFO: tira os pontos dos lotes mais antigos primeiro."""
    falta = pontos
    lotes = cliente.movimentos.filter(
        tipo=Tipo.ACUMULO, restante__gt=0, expira_em__gt=em
    ).order_by("data", "id")
    for lote in lotes:
        usar = min(falta, lote.restante)
        lote.restante -= usar
        lote.save(update_fields=["restante"])
        falta -= usar
        if falta == 0:
            return
    # Não deveria acontecer, porque o saldo foi checado antes.
    raise RegraViolada("Saldo de pontos insuficiente.")


@transaction.atomic
def registrar_compra(cpf, loja: Loja, valor_bruto, pontos_resgate: int = 0, data=None) -> Compra:
    """
    Registra uma compra identificada por CPF, aplicando TODAS as regras, nesta ordem:
      1. expira os pontos vencidos do cliente;
      2. valida o resgate (múltiplo de 100, saldo suficiente, desconto <= valor);
      3. calcula o nível ANTES da compra;
      4. calcula os pontos sobre o valor PAGO, com o bônus do nível;
      5. grava a compra, o RESGATE (FIFO) e o novo lote de ACUMULO.
    Se qualquer passo falhar, nada é gravado (transaction.atomic).
    """
    data = data or timezone.now()
    try:
        valor_bruto = Decimal(str(valor_bruto)).quantize(Decimal("0.01"))
    except Exception:
        raise RegraViolada("Valor da compra inválido.")
    if valor_bruto <= 0:
        raise RegraViolada("O valor da compra precisa ser maior que zero.")

    pontos_resgate = int(pontos_resgate or 0)

    try:
        cliente = Cliente.objects.select_for_update().get(cpf=cpf_utils.limpar(cpf))
    except Cliente.DoesNotExist:
        raise RegraViolada("CPF não cadastrado no programa.")

    expirar_pontos(cliente, data)

    if pontos_resgate < 0 or pontos_resgate % regras.BLOCO_RESGATE != 0:
        raise RegraViolada(f"O resgate precisa ser em múltiplos de {regras.BLOCO_RESGATE} pontos.")
    disponivel = saldo(cliente)
    if pontos_resgate > disponivel:
        raise RegraViolada(f"Saldo insuficiente: o cliente tem {disponivel} pontos.")
    desconto = regras.desconto_do_resgate(pontos_resgate)
    if desconto > valor_bruto:
        raise RegraViolada("O desconto dos pontos não pode ser maior que o valor da compra.")

    valor_pago = valor_bruto - desconto
    nivel = nivel_atual(cliente, data)
    ganhos = regras.calcular_pontos(valor_pago, nivel)

    compra = Compra.objects.create(
        cliente=cliente,
        loja=loja,
        data=data,
        valor_bruto=valor_bruto,
        pontos_resgatados=pontos_resgate,
        desconto=desconto,
        valor_pago=valor_pago,
        nivel_na_compra=nivel,
        pontos_ganhos=ganhos,
    )

    if pontos_resgate:
        _consumir_lotes(cliente, pontos_resgate, data)
        MovimentoPontos.objects.create(
            cliente=cliente, compra=compra, tipo=Tipo.RESGATE, pontos=-pontos_resgate, data=data
        )

    if ganhos:
        MovimentoPontos.objects.create(
            cliente=cliente,
            compra=compra,
            tipo=Tipo.ACUMULO,
            pontos=ganhos,
            restante=ganhos,
            data=data,
            expira_em=data + regras.VALIDADE_PONTOS,
        )

    return compra
