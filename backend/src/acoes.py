from datetime import timedelta

from django.db.models import Count, Max, Min, Sum
from django.utils import timezone

from . import cpf as cpf_utils
from . import indicadores, regras
from .models import Cliente, MovimentoPontos

DIAS_PARA_SUMIDO = 60
DIAS_PARA_VENCER = 30
PONTOS_PARA_SUBIR = 300
DIAS_PARA_SEGUNDA_COMPRA = 30


def _cliente(cliente, detalhe):
    return {"nome": cliente.nome, "cpf": cpf_utils.mascarar(cliente.cpf), "detalhe": detalhe}


# Feito com IA: listas da aba Ações, calculadas a partir das compras e do livro-razão de pontos.
def clientes_sumindo(ref):
    limite = ref - timedelta(days=DIAS_PARA_SUMIDO)
    clientes = (
        Cliente.objects.annotate(ultima=Max("compras__data"))
        .filter(ultima__lt=limite)
        .order_by("-ultima")
    )
    return [_cliente(c, f"sem comprar há {(ref - c.ultima).days} dias") for c in clientes]


def pontos_vencendo(ref):
    lotes = (
        MovimentoPontos.objects.filter(
            tipo=MovimentoPontos.Tipo.ACUMULO,
            restante__gt=0,
            expira_em__gt=ref,
            expira_em__lte=ref + timedelta(days=DIAS_PARA_VENCER),
        )
        .values("cliente")
        .annotate(pontos=Sum("restante"), vence=Min("expira_em"))
        .order_by("vence")
    )
    clientes = Cliente.objects.in_bulk([lote["cliente"] for lote in lotes])
    resultado = []
    for lote in lotes:
        data = timezone.localtime(lote["vence"]).strftime("%d/%m")
        resultado.append(_cliente(clientes[lote["cliente"]], f"{lote['pontos']} pts vencem em {data}"))
    return resultado


def perto_de_subir(ref):
    resultado = []
    for c in indicadores.pontos_12m_por_cliente(ref).order_by("nome"):
        proximo = regras.proximo_nivel(c.p12)
        if proximo is None:
            continue
        nome_nivel, faltam = proximo
        if faltam <= PONTOS_PARA_SUBIR:
            resultado.append((faltam, _cliente(c, f"faltam {faltam} pts para {nome_nivel}")))
    resultado.sort(key=lambda item: item[0])
    return [cliente for _faltam, cliente in resultado]


def novos_sem_segunda_compra(ref):
    limite = ref - timedelta(days=DIAS_PARA_SEGUNDA_COMPRA)
    clientes = (
        Cliente.objects.filter(cadastrado_em__lt=limite)
        .annotate(compras_feitas=Count("compras"))
        .filter(compras_feitas=1)
        .order_by("-cadastrado_em")
    )
    return [_cliente(c, f"cadastrado em {timezone.localtime(c.cadastrado_em):%d/%m/%Y}") for c in clientes]


def acoes_do_dia(ref=None):
    ref = ref or timezone.now()
    return [
        {
            "tipo": "sumindo",
            "titulo": "Clientes sumindo",
            "descricao": f"Não compram há mais de {DIAS_PARA_SUMIDO} dias.",
            "mensagem": "Oi! Sentimos sua falta na FATECalçados. Seus pontos continuam te esperando: "
                        "passe na loja e confira as novidades.",
            "clientes": clientes_sumindo(ref),
        },
        {
            "tipo": "vencendo",
            "titulo": "Pontos vencendo",
            "descricao": f"Têm pontos que expiram nos próximos {DIAS_PARA_VENCER} dias.",
            "mensagem": "Oi! Você tem pontos na FATECalçados que vencem em breve. "
                        "Use antes de perder: cada 100 pontos valem R$ 5,00 de desconto.",
            "clientes": pontos_vencendo(ref),
        },
        {
            "tipo": "subir",
            "titulo": "Perto de subir de nível",
            "descricao": f"Faltam até {PONTOS_PARA_SUBIR} pontos para o próximo nível.",
            "mensagem": "Oi! Falta pouco para você subir de nível na FATECalçados "
                        "e ganhar mais pontos em cada compra. Que tal passar na loja?",
            "clientes": perto_de_subir(ref),
        },
        {
            "tipo": "segunda_compra",
            "titulo": "Novos sem segunda compra",
            "descricao": f"Cadastrados há mais de {DIAS_PARA_SEGUNDA_COMPRA} dias, com uma compra só.",
            "mensagem": "Oi! Obrigado por entrar no programa de fidelidade da FATECalçados. "
                        "Na próxima compra você já soma mais pontos.",
            "clientes": novos_sem_segunda_compra(ref),
        },
    ]
