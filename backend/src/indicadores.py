from datetime import datetime, time, timedelta

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from . import regras
from .models import Cliente, Compra, FormaPagamento, ItemCompra, MovimentoPontos

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
# (Sum com filter numa única consulta, em vez de uma consulta por cliente). Contas excluídas ficam de fora:
# esta é a base das listas de clientes, do ranking, dos níveis e das ações.
def pontos_12m_por_cliente(ref):
    return Cliente.objects.filter(cadastrado_em__lte=ref, excluido_em__isnull=True).annotate(
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
                "id": c.id,
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


def _percentual(parte, total, casas=1):
    return round(100 * float(parte) / float(total), casas) if total else 0


# Feito com IA: recortes de vendas do dashboard. Contam TODAS as vendas do período (com e sem CPF),
# ao contrário de `pontos_e_custo`, que só olha as compras com CPF.
def resumo_de_vendas(inicio, fim):
    vendas = Compra.objects.filter(data__gte=inicio, data__lte=fim).aggregate(
        quantidade=Count("id"),
        com_cpf=Count("id", filter=Q(cliente__isnull=False)),
        faturamento=Coalesce(Sum("valor_pago"), 0, output_field=Compra._meta.get_field("valor_pago")),
    )
    faturamento = float(vendas["faturamento"])
    return {
        "quantidade": vendas["quantidade"],
        "faturamento": faturamento,
        "ticket_medio": round(faturamento / vendas["quantidade"], 2) if vendas["quantidade"] else 0,
        "com_cpf": vendas["com_cpf"],
        "percentual_com_cpf": _percentual(vendas["com_cpf"], vendas["quantidade"]),
    }


def _agrupar_vendas(inicio, fim, *campos):
    return (
        Compra.objects.filter(data__gte=inicio, data__lte=fim)
        .values(*campos)
        .annotate(
            quantidade=Count("id"),
            faturamento=Coalesce(Sum("valor_pago"), 0, output_field=Compra._meta.get_field("valor_pago")),
        )
        .order_by("-faturamento")
    )


# Feito com IA: cada loja tem o seu "Caixa 01", então o grupo é caixa + loja (só o nome juntaria todas as lojas).
def vendas_por_caixa(inicio, fim):
    grupos = list(_agrupar_vendas(inicio, fim, "caixa__nome", "caixa__loja__nome"))
    total = sum(g["faturamento"] for g in grupos)
    return [
        {
            "nome": f"{g['caixa__nome']} · {g['caixa__loja__nome']}" if g["caixa__nome"] else "Sem caixa",
            "quantidade": g["quantidade"],
            "faturamento": float(g["faturamento"]),
            "percentual": _percentual(g["faturamento"], total),
        }
        for g in grupos
    ]


def vendas_por_pagamento(inicio, fim):
    nomes = dict(FormaPagamento.choices)
    grupos = list(_agrupar_vendas(inicio, fim, "forma_pagamento"))
    total = sum(g["faturamento"] for g in grupos)
    return [
        {
            "codigo": g["forma_pagamento"],
            "nome": nomes.get(g["forma_pagamento"], "Não informado"),
            "quantidade": g["quantidade"],
            "faturamento": float(g["faturamento"]),
            "percentual": _percentual(g["faturamento"], total),
        }
        for g in grupos
    ]


def produtos_mais_vendidos(inicio, fim, limite=5):
    receita = ExpressionWrapper(F("quantidade") * F("preco_unitario"), output_field=DecimalField(max_digits=12, decimal_places=2))
    linhas = (
        ItemCompra.objects.filter(compra__data__gte=inicio, compra__data__lte=fim)
        .values("produto__sku", "produto__nome")
        .annotate(unidades=Sum("quantidade"), receita=Sum(receita))
        .order_by("-unidades", "-receita", "produto__nome")[:limite]
    )
    return [
        {"sku": l["produto__sku"], "nome": l["produto__nome"], "unidades": l["unidades"], "receita": float(l["receita"])}
        for l in linhas
    ]


# Feito com IA: o resgate por nível usa `nivel_na_compra` (o nível de ANTES da compra, gravado na venda),
# então mostra qual nível mais usa os pontos, mesmo que o cliente tenha mudado de nível depois.
def resgate_por_nivel(inicio, fim):
    grupos = {
        g["nivel_na_compra"]: g
        for g in Compra.objects.filter(data__gte=inicio, data__lte=fim, cliente__isnull=False)
        .values("nivel_na_compra")
        .annotate(
            compras=Count("id"),
            com_resgate=Count("id", filter=Q(pontos_resgatados__gt=0)),
            pontos_resgatados=Coalesce(Sum("pontos_resgatados"), 0),
            pontos_ganhos=Coalesce(Sum("pontos_ganhos"), 0),
        )
    }
    linhas = []
    for codigo, nome, _minimo, _bonus in regras.NIVEIS:
        g = grupos.get(codigo, {})
        compras = g.get("compras", 0)
        com_resgate = g.get("com_resgate", 0)
        linhas.append({
            "codigo": codigo,
            "nome": nome,
            "compras": compras,
            "compras_com_resgate": com_resgate,
            "taxa_resgate": _percentual(com_resgate, compras),
            "pontos_resgatados": g.get("pontos_resgatados", 0),
            "pontos_ganhos": g.get("pontos_ganhos", 0),
        })
    return linhas


# Feito com IA: pontos que vão vencer nos próximos `dias` dias, somando o que resta de cada lote válido.
def pontos_a_vencer(ref, dias):
    pontos = (
        MovimentoPontos.objects.filter(
            tipo=Tipo.ACUMULO, restante__gt=0, expira_em__gt=ref, expira_em__lte=ref + timedelta(days=dias)
        ).aggregate(t=Sum("restante"))["t"]
        or 0
    )
    return {"dias": dias, "pontos": pontos, "reais": float(regras.desconto_do_resgate(pontos))}
