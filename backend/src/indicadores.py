from datetime import datetime, time

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from . import regras
from .models import Cliente, Compra, MovimentoPontos

Tipo = MovimentoPontos.Tipo


def periodo_padrao():
    fim = timezone.localtime()
    ano, mes = fim.year, fim.month - 11
    if mes <= 0:
        ano, mes = ano - 1, mes + 12
    inicio = timezone.make_aware(datetime(ano, mes, 1))
    return inicio, fim


def periodo_de_datas(data_inicio, data_fim):
    inicio = timezone.make_aware(datetime.combine(data_inicio, time.min))
    fim = timezone.make_aware(datetime.combine(data_fim, time.max))
    return inicio, min(fim, timezone.localtime())


# Feito com IA: soma, para cada cliente, os pontos acumulados nos 12 meses até `ref`
# (Sum com filter numa única consulta, em vez de uma consulta por cliente).
def pontos_12m_por_cliente(ref):
    return Cliente.objects.filter(cadastrado_em__lte=ref).annotate(
        p12=Coalesce(
            Sum(
                "movimentos__pontos",
                filter=Q(
                    movimentos__tipo=Tipo.ACUMULO,
                    movimentos__data__gt=ref - regras.JANELA_NIVEL,
                    movimentos__data__lte=ref,
                ),
            ),
            0,
        )
    )


def base_do_programa(ref):
    contagem = {codigo: 0 for codigo, *_ in regras.NIVEIS}
    for p12 in pontos_12m_por_cliente(ref).values_list("p12", flat=True):
        contagem[regras.nivel_por_pontos(p12)] += 1
    total = sum(contagem.values())
    niveis = [
        {
            "codigo": codigo,
            "nome": nome,
            "bonus": bonus,
            "clientes": contagem[codigo],
            "percentual": round(100 * contagem[codigo] / total, 1) if total else 0,
        }
        for codigo, nome, minimo, bonus in regras.NIVEIS
    ]
    return {"total": total, "niveis": niveis}


def pontos_e_custo(inicio, fim):
    periodo = MovimentoPontos.objects.filter(data__gte=inicio, data__lte=fim)
    somas = periodo.aggregate(
        acumulados=Coalesce(Sum("pontos", filter=Q(tipo=Tipo.ACUMULO)), 0),
        resgatados=Coalesce(Sum("pontos", filter=Q(tipo=Tipo.RESGATE)), 0),
        expirados=Coalesce(Sum("pontos", filter=Q(tipo=Tipo.EXPIRACAO)), 0),
    )
    acumulados = somas["acumulados"]
    resgatados = -somas["resgatados"]
    expirados = -somas["expirados"]

    compras = Compra.objects.filter(data__gte=inicio, data__lte=fim).aggregate(
        custo=Coalesce(Sum("desconto"), 0, output_field=Compra._meta.get_field("desconto")),
        quantidade=Count("id", filter=Q(cliente__isnull=False)),
        com_resgate=Count("id", filter=Q(pontos_resgatados__gt=0)),
        faturamento=Coalesce(Sum("valor_pago"), 0, output_field=Compra._meta.get_field("valor_pago")),
    )

    em_aberto = (
        MovimentoPontos.objects.filter(data__lte=fim).aggregate(t=Sum("pontos"))["t"] or 0
    )

    return {
        "acumulados": acumulados,
        "resgatados": resgatados,
        "expirados": expirados,
        "taxa_resgate": round(100 * resgatados / acumulados, 1) if acumulados else 0,
        "custo": compras["custo"],
        "compras": compras["quantidade"],
        "compras_com_resgate": compras["com_resgate"],
        "faturamento": compras["faturamento"],
        "custo_sobre_faturamento": (
            round(100 * compras["custo"] / compras["faturamento"], 2) if compras["faturamento"] else 0
        ),
        "em_aberto": em_aberto,
        "em_aberto_reais": regras.desconto_do_resgate(em_aberto),
    }


def ranking(inicio, fim, limite=10):
    clientes = (
        pontos_12m_por_cliente(fim)
        .annotate(
            acumulado=Coalesce(
                Sum(
                    "movimentos__pontos",
                    filter=Q(
                        movimentos__tipo=Tipo.ACUMULO,
                        movimentos__data__gte=inicio,
                        movimentos__data__lte=fim,
                    ),
                ),
                0,
            ),
            saldo=Coalesce(Sum("movimentos__pontos", filter=Q(movimentos__data__lte=fim)), 0),
        )
        .filter(acumulado__gt=0)
        .order_by("-acumulado", "nome")[:limite]
    )
    linhas = []
    for posicao, c in enumerate(clientes, start=1):
        nivel = regras.nivel_por_pontos(c.p12)
        linhas.append(
            {
                "posicao": posicao,
                "nome": c.nome,
                "cpf": c.cpf,
                "nivel": nivel,
                "nivel_nome": regras.nome_do_nivel(nivel),
                "acumulado": c.acumulado,
                "saldo": c.saldo,
            }
        )
    return linhas


def _meses(inicio, fim):
    inicio, fim = timezone.localtime(inicio), timezone.localtime(fim)
    ano, mes = inicio.year, inicio.month
    while (ano, mes) <= (fim.year, fim.month):
        yield ano, mes
        ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)


NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


# Feito com IA: agrupa movimentos e compras por mês (TruncMonth) e preenche os meses sem movimento com zero.
def evolucao_mensal(inicio, fim):
    pontos = (
        MovimentoPontos.objects.filter(data__gte=inicio, data__lte=fim)
        .annotate(mes=TruncMonth("data"))
        .values("mes", "tipo")
        .annotate(total=Sum("pontos"))
    )
    custo = (
        Compra.objects.filter(data__gte=inicio, data__lte=fim)
        .annotate(mes=TruncMonth("data"))
        .values("mes")
        .annotate(total=Sum("desconto"), clientes=Count("cliente", distinct=True))
    )
    por_mes = {}
    for linha in pontos:
        chave = (linha["mes"].year, linha["mes"].month)
        por_mes.setdefault(chave, {})[linha["tipo"]] = abs(linha["total"])
    custo_mes = {(l["mes"].year, l["mes"].month): l for l in custo}

    serie = {"labels": [], "acumulados": [], "resgatados": [], "expirados": [], "custo": [], "clientes": []}
    for ano, mes in _meses(inicio, fim):
        dados = por_mes.get((ano, mes), {})
        serie["labels"].append(f"{NOMES_MES[mes - 1]}/{str(ano)[2:]}")
        serie["acumulados"].append(dados.get(Tipo.ACUMULO, 0))
        serie["resgatados"].append(dados.get(Tipo.RESGATE, 0))
        serie["expirados"].append(dados.get(Tipo.EXPIRACAO, 0))
        c = custo_mes.get((ano, mes))
        serie["custo"].append(float(c["total"]) if c else 0)
        serie["clientes"].append(c["clientes"] if c else 0)
    return serie
