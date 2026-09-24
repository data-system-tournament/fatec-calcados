import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from . import cpf as cpf_utils
from . import regras
from .models import Caixa, Cliente, Compra, FormaPagamento, ItemCompra, Loja, MovimentoPontos, Produto

Tipo = MovimentoPontos.Tipo


class RegraViolada(Exception):
    pass


def saldo(cliente: Cliente, ate=None) -> int:
    movimentos = cliente.movimentos.all()
    if ate is not None:
        movimentos = movimentos.filter(data__lte=ate)
    return movimentos.aggregate(total=Sum("pontos"))["total"] or 0


def pontos_12m(cliente: Cliente, em=None) -> int:
    em = em or timezone.now()
    return (
        cliente.movimentos.filter(
            tipo=Tipo.ACUMULO, data__gt=em - regras.JANELA_NIVEL, data__lte=em
        ).aggregate(total=Sum("pontos"))["total"]
        or 0
    )


def nivel_atual(cliente: Cliente, em=None) -> str:
    return regras.nivel_por_pontos(pontos_12m(cliente, em))


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


# Feito com IA: zera os lotes vencidos e registra a EXPIRACAO na data em que o lote venceu.
# select_for_update trava os lotes para duas consultas simultâneas não expirarem o mesmo lote duas vezes.
@transaction.atomic
def expirar_pontos(cliente: Cliente, ate=None) -> int:
    ate = ate or timezone.now()
    vencidos = cliente.movimentos.select_for_update().filter(
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


# Feito com IA: resgate FIFO, tira os pontos dos lotes mais antigos primeiro.
def _consumir_lotes(cliente: Cliente, pontos: int, em):
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
    raise RegraViolada("Saldo de pontos insuficiente.")


# Feito com IA: aplica as regras nesta ordem: expira vencidos -> valida o resgate ->
# nível de ANTES da compra -> pontos sobre o valor pago -> grava compra, resgate e novo lote.
# transaction.atomic: se qualquer passo falhar, nada é gravado.
@transaction.atomic
def registrar_compra(
    cpf, loja: Loja, valor_bruto, pontos_resgate: int = 0, data=None,
    *, caixa: Caixa | None = None, forma_pagamento: str = "", id=None,
) -> Compra:
    data = data or timezone.now()
    try:
        valor_bruto = Decimal(str(valor_bruto)).quantize(Decimal("0.01"))
    except Exception:
        raise RegraViolada("Valor da compra inválido.")
    if valor_bruto <= 0:
        raise RegraViolada("O valor da compra precisa ser maior que zero.")

    try:
        pontos_resgate = int(pontos_resgate or 0)
    except (TypeError, ValueError):
        raise RegraViolada("Quantidade de pontos para resgate inválida.")

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
        id=id or uuid.uuid4(),
        cliente=cliente,
        loja=loja,
        caixa=caixa,
        forma_pagamento=forma_pagamento,
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


def buscar_produtos(texto: str = ""):
    produtos = Produto.objects.filter(ativo=True)
    texto = (texto or "").strip()
    if texto:
        produtos = produtos.filter(Q(nome__icontains=texto) | Q(sku__startswith=texto))
    return produtos


def _itens_da_venda(itens):
    if not itens:
        raise RegraViolada("A venda precisa ter pelo menos um item.")

    linhas = []
    for item in itens:
        try:
            sku = str(item["sku"])
            quantidade = int(item["quantidade"])
        except (KeyError, TypeError, ValueError):
            raise RegraViolada("Cada item precisa de sku e quantidade.")
        if quantidade < 1:
            raise RegraViolada("A quantidade de cada item precisa ser pelo menos 1.")

        produto = Produto.objects.filter(sku=sku, ativo=True).first()
        if produto is None:
            raise RegraViolada(f"Produto {sku} não encontrado.")
        linhas.append((produto, quantidade))
    return linhas


# Feito com IA: venda do caixa. O preço vem do banco (o caixa manda só sku e quantidade).
# Se o mesmo `id` chegar de novo (venda offline reenviada), devolve a venda existente sem duplicar.
@transaction.atomic
def registrar_venda(
    caixa: Caixa, itens, forma_pagamento: str, cpf=None, pontos_resgate: int = 0, data=None, id=None,
):
    if id is not None:
        try:
            id = uuid.UUID(str(id))
        except ValueError:
            raise RegraViolada("Identificador da venda inválido.")
        existente = Compra.objects.filter(id=id).first()
        if existente:
            return existente, False

    if forma_pagamento not in FormaPagamento.values:
        raise RegraViolada("Forma de pagamento inválida.")

    linhas = _itens_da_venda(itens)
    valor_bruto = sum(produto.preco * quantidade for produto, quantidade in linhas)

    if cpf:
        compra = registrar_compra(
            cpf, caixa.loja, valor_bruto, pontos_resgate, data,
            caixa=caixa, forma_pagamento=forma_pagamento, id=id,
        )
    else:
        if pontos_resgate:
            raise RegraViolada("Para usar pontos, informe o CPF do cliente.")
        compra = Compra.objects.create(
            id=id or uuid.uuid4(),
            loja=caixa.loja,
            caixa=caixa,
            forma_pagamento=forma_pagamento,
            data=data or timezone.now(),
            valor_bruto=valor_bruto,
            valor_pago=valor_bruto,
        )

    ItemCompra.objects.bulk_create([
        ItemCompra(compra=compra, produto=produto, quantidade=quantidade, preco_unitario=produto.preco)
        for produto, quantidade in linhas
    ])
    return compra, True

