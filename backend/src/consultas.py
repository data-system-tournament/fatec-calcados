from decimal import Decimal

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from . import cpf as cpf_utils
from . import indicadores, regras
from .models import Caixa, Compra, FormaPagamento, MovimentoPontos

Tipo = MovimentoPontos.Tipo

TAMANHO_PAGINA = 20


# Feito com IA: consultas de leitura das telas de Clientes e Vendas. Não gravam nada: nem a expiração
# de pontos (o saldo é calculado só com os lotes ainda válidos).
def _paginar(consulta, pagina, tamanho=TAMANHO_PAGINA):
    paginador = Paginator(consulta, tamanho)
    try:
        numero = int(pagina)
    except (TypeError, ValueError):
        numero = 1
    try:
        pagina_atual = paginador.page(max(numero, 1))
    except EmptyPage:
        pagina_atual = paginador.page(paginador.num_pages)
    return pagina_atual, {
        "total": paginador.count,
        "pagina": pagina_atual.number,
        "paginas": paginador.num_pages,
    }


# O saldo é a soma do que resta em cada lote ainda válido. Dá o mesmo número de services.saldo depois
# de expirar_pontos, mas sem lançar expirações numa consulta de leitura.
def _lotes_validos(agora):
    return Q(
        movimentos__tipo=Tipo.ACUMULO,
        movimentos__restante__gt=0,
        movimentos__expira_em__gt=agora,
    )


def listar_clientes(busca="", nivel="", pagina=1, agora=None):
    agora = agora or timezone.now()
    clientes = indicadores.pontos_12m_por_cliente(agora).annotate(
        saldo=Coalesce(Sum("movimentos__restante", filter=_lotes_validos(agora)), 0)
    )

    busca = (busca or "").strip()
    if busca:
        digitos = cpf_utils.limpar(busca)
        filtro = Q(nome__icontains=busca)
        if digitos:
            filtro |= Q(cpf__contains=digitos)
        clientes = clientes.filter(filtro)

    nivel = (nivel or "").upper()
    if nivel in {codigo for codigo, *_ in regras.NIVEIS}:
        minimo, limite = regras.faixa_do_nivel(nivel)
        clientes = clientes.filter(p12__gte=minimo)
        if limite is not None:
            clientes = clientes.filter(p12__lt=limite)

    pagina_atual, paginacao = _paginar(clientes.order_by("nome", "id"), pagina)
    ids = [c.id for c in pagina_atual]
    compras = {
        linha["cliente"]: linha
        for linha in Compra.objects.filter(cliente__in=ids)
        .values("cliente")
        .annotate(quantidade=Count("id"), ultima=Max("data"))
    }
    linhas = []
    for c in pagina_atual:
        nivel_do_cliente = regras.nivel_por_pontos(c.p12)
        resumo = compras.get(c.id)
        linhas.append({
            "id": c.id,
            "nome": c.nome,
            "cpf": cpf_utils.mascarar(c.cpf),
            "nivel": nivel_do_cliente,
            "nivel_nome": regras.nome_do_nivel(nivel_do_cliente),
            "saldo_pontos": c.saldo,
            "compras": resumo["quantidade"] if resumo else 0,
            "ultima_compra": resumo["ultima"] if resumo else None,
        })
    return {**paginacao, "clientes": linhas}


def perfil_do_cliente(cliente, agora=None):
    agora = agora or timezone.now()
    ativos = list(
        cliente.movimentos.filter(tipo=Tipo.ACUMULO, restante__gt=0, expira_em__gt=agora).order_by("expira_em", "id")
    )
    saldo = sum(lote.restante for lote in ativos)
    resgataveis = saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE

    p12 = cliente.movimentos.filter(
        tipo=Tipo.ACUMULO, data__gt=agora - regras.JANELA_NIVEL, data__lte=agora
    ).aggregate(t=Sum("pontos"))["t"] or 0
    nivel = regras.nivel_por_pontos(p12)
    proximo = regras.proximo_nivel(p12)

    compras = cliente.compras.select_related("caixa")
    totais = compras.aggregate(
        quantidade=Count("id"),
        gasto=Coalesce(Sum("valor_pago"), Decimal("0")),
        pontos_ganhos=Coalesce(Sum("pontos_ganhos"), 0),
        pontos_resgatados=Coalesce(Sum("pontos_resgatados"), 0),
    )

    return {
        "id": cliente.id,
        "nome": cliente.nome,
        "cpf": cpf_utils.mascarar(cliente.cpf),
        "cadastrado_em": cliente.cadastrado_em,
        "loja_cadastro": cliente.loja_cadastro.nome if cliente.loja_cadastro else None,
        "nivel": nivel,
        "nivel_nome": regras.nome_do_nivel(nivel),
        "bonus_percentual": regras.bonus_do_nivel(nivel),
        "pontos_12m": p12,
        "proximo_nivel": {"nome": proximo[0], "faltam": proximo[1]} if proximo else None,
        "saldo_pontos": saldo,
        "pontos_resgataveis": resgataveis,
        "valor_resgatavel": float(regras.desconto_do_resgate(resgataveis)),
        "total_compras": totais["quantidade"],
        "total_gasto": float(totais["gasto"]),
        "total_pontos_ganhos": totais["pontos_ganhos"],
        "total_pontos_resgatados": totais["pontos_resgatados"],
        "lotes": [{"pontos": lote.restante, "expira_em": lote.expira_em} for lote in ativos],
        "compras": [
            {
                "id": str(c.id),
                "data": c.data,
                "caixa": c.caixa.nome if c.caixa else None,
                "forma_pagamento": c.forma_pagamento,
                "valor_pago": float(c.valor_pago),
                "desconto": float(c.desconto),
                "pontos_ganhos": c.pontos_ganhos,
                "pontos_resgatados": c.pontos_resgatados,
            }
            for c in compras[:20]
        ],
        "movimentos": [
            {"data": m.data, "tipo": m.tipo, "pontos": m.pontos}
            for m in cliente.movimentos.order_by("-data", "-id")[:30]
        ],
    }


def _vendas_filtradas(inicio, fim, caixa, pagamento):
    vendas = Compra.objects.all()
    if inicio:
        vendas = vendas.filter(data__gte=indicadores.periodo_de_datas(inicio, inicio)[0])
    if fim:
        vendas = vendas.filter(data__lte=indicadores.periodo_de_datas(fim, fim)[1])
    if caixa:
        vendas = vendas.filter(caixa__codigo=caixa)
    if pagamento in FormaPagamento.values:
        vendas = vendas.filter(forma_pagamento=pagamento)
    return vendas


def listar_vendas(inicio=None, fim=None, caixa="", pagamento="", pagina=1):
    vendas = _vendas_filtradas(inicio, fim, caixa, pagamento)
    totais = vendas.aggregate(
        faturamento=Coalesce(Sum("valor_pago"), Decimal("0")),
        desconto=Coalesce(Sum("desconto"), Decimal("0")),
    )
    consulta = (
        vendas.select_related("cliente", "caixa")
        .annotate(itens_qtd=Coalesce(Sum("itens__quantidade"), 0))
        .order_by("-data", "id")
    )
    pagina_atual, paginacao = _paginar(consulta, pagina)
    return {
        **paginacao,
        "faturamento": float(totais["faturamento"]),
        "desconto": float(totais["desconto"]),
        "filtros": {
            "caixas": [
                {"codigo": c.codigo, "nome": f"{c.nome} · {c.loja.nome}"}
                for c in Caixa.objects.select_related("loja")
            ],
            "formas_pagamento": [{"codigo": codigo, "nome": nome} for codigo, nome in FormaPagamento.choices],
        },
        "vendas": [
            {
                "id": str(v.id),
                "data": v.data,
                "cliente": {"id": v.cliente.id, "nome": v.cliente.nome} if v.cliente else None,
                "caixa": v.caixa.nome if v.caixa else None,
                "forma_pagamento": v.forma_pagamento,
                "itens_qtd": v.itens_qtd,
                "valor_bruto": float(v.valor_bruto),
                "desconto": float(v.desconto),
                "valor_pago": float(v.valor_pago),
                "pontos_ganhos": v.pontos_ganhos,
                "pontos_resgatados": v.pontos_resgatados,
            }
            for v in pagina_atual
        ],
    }


def detalhe_da_venda(compra):
    return {
        "id": str(compra.id),
        "data": compra.data,
        "cliente": {"id": compra.cliente.id, "nome": compra.cliente.nome} if compra.cliente else None,
        "loja": compra.loja.nome,
        "caixa": compra.caixa.nome if compra.caixa else None,
        "forma_pagamento": compra.forma_pagamento,
        "nivel_na_compra": compra.nivel_na_compra,
        "nivel_na_compra_nome": regras.nome_do_nivel(compra.nivel_na_compra) if compra.nivel_na_compra else "",
        "valor_bruto": float(compra.valor_bruto),
        "desconto": float(compra.desconto),
        "valor_pago": float(compra.valor_pago),
        "pontos_ganhos": compra.pontos_ganhos,
        "pontos_resgatados": compra.pontos_resgatados,
        "itens": [
            {
                "sku": i.produto.sku,
                "nome": i.produto.nome,
                "quantidade": i.quantidade,
                "preco_unitario": float(i.preco_unitario),
                "subtotal": float(i.preco_unitario * i.quantidade),
            }
            for i in compra.itens.select_related("produto")
        ],
    }
