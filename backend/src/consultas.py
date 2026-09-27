from datetime import timedelta
from decimal import Decimal

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from . import cpf as cpf_utils
from . import indicadores, regras
from .models import Avaliacao, Caixa, Compra, FormaPagamento, ItemCompra, MovimentoPontos, Produto

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


# Ordens da lista de clientes. O padrão é o saldo, do maior para o menor (quem tem mais pontos primeiro);
# o nome desempata, e o id deixa a paginação estável.
ORDENS_DE_CLIENTES = {"saldo": ("-saldo", "nome", "id"), "nome": ("nome", "id")}


def listar_clientes(busca="", nivel="", pagina=1, agora=None, ordem="saldo"):
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

    ordenacao = ORDENS_DE_CLIENTES.get(ordem, ORDENS_DE_CLIENTES["saldo"])
    pagina_atual, paginacao = _paginar(clientes.order_by(*ordenacao), pagina)
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
        "numeracao": cliente.numeracao,
        "nascimento": cliente.nascimento,
        "contato_autorizado_em": cliente.contato_autorizado_em,
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
        # `avaliacao`: nome do produto quando o acúmulo veio de uma avaliação (e não de uma compra).
        "movimentos": [
            {"data": m.data, "tipo": m.tipo, "pontos": m.pontos, "avaliacao": _produto_avaliado(m)}
            for m in cliente.movimentos.select_related("avaliacao__produto").order_by("-data", "-id")[:30]
        ],
    }


def _produto_avaliado(movimento):
    # getattr com padrão: sem avaliação, o acesso ao OneToOne reverso levanta RelatedObjectDoesNotExist,
    # que é um AttributeError.
    avaliacao = getattr(movimento, "avaliacao", None)
    return avaliacao.produto.nome if avaliacao else None


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


DIAS_A_VENCER = 30


# Feito com IA: painel da área do cliente = o perfil que a loja vê + o que interessa a quem compra:
# quanto falta para o próximo nível (em %), pontos que vencem logo, quanto já economizou com pontos
# e os produtos que ele mais compra (para o "compre de novo"). Só leitura, como o resto deste arquivo.
def painel_do_cliente(cliente, agora=None):
    agora = agora or timezone.now()
    perfil = perfil_do_cliente(cliente, agora)

    p12 = perfil["pontos_12m"]
    proximo = perfil["proximo_nivel"]
    progresso = 100 if proximo is None else min(100, round(100 * p12 / (p12 + proximo["faltam"])))

    limite = agora + timezone.timedelta(days=DIAS_A_VENCER)
    vencendo = [lote for lote in perfil["lotes"] if lote["expira_em"] <= limite]

    economia = cliente.compras.aggregate(t=Coalesce(Sum("desconto"), Decimal("0")))["t"]
    mais_comprados = (
        ItemCompra.objects.filter(compra__cliente=cliente, produto__ativo=True)
        .values("produto__sku", "produto__nome", "produto__preco", "produto__foto")
        .annotate(unidades=Sum("quantidade"))
        .order_by("-unidades", "produto__nome")[:3]
    )

    # Para as notificações do cliente: quantos produtos comprados esperam avaliação e a compra mais
    # recente entre eles (uma compra nova faz o aviso voltar como não lido).
    para_avaliar = _para_avaliar(cliente)
    pendentes = para_avaliar.count()

    return {
        **perfil,
        "avaliacoes_pendentes": {
            "quantidade": pendentes,
            "pontos": pendentes * regras.PONTOS_POR_AVALIACAO,
            "ultima_compra": para_avaliar[0]["ultima_compra"] if pendentes else None,
        },
        "progresso_nivel": progresso,
        "a_vencer": {
            "dias": DIAS_A_VENCER,
            "pontos": sum(lote["pontos"] for lote in vencendo),
            "proxima_data": vencendo[0]["expira_em"] if vencendo else None,
        },
        "economia": float(economia),
        "mais_comprados": [
            {
                "sku": linha["produto__sku"],
                "nome": linha["produto__nome"],
                "preco": float(linha["produto__preco"]),
                "foto": linha["produto__foto"],
                "unidades": linha["unidades"],
            }
            for linha in mais_comprados
        ],
    }


# Produtos que o cliente comprou (no caixa ou online) e ainda não avaliou, do mais recente para o mais antigo.
def _para_avaliar(cliente):
    avaliados = Avaliacao.objects.filter(cliente=cliente).values("produto_id")
    return (
        ItemCompra.objects.filter(compra__cliente=cliente)
        .exclude(produto_id__in=avaliados)
        .values("produto__sku", "produto__nome", "produto__preco", "produto__foto")
        .annotate(ultima_compra=Max("compra__data"))
        .order_by("-ultima_compra", "produto__nome")
    )


# Feito com IA: tela de avaliações do cliente. "Para avaliar" são os produtos que ele comprou (no caixa ou
# online) e ainda não avaliou, do mais recente para o mais antigo; "avaliadas" são as que já fez. As regras
# (pontos e comentário mínimo) vão junto para o front não precisar copiá-las.
def avaliacoes_do_cliente(cliente):
    avaliadas = list(cliente.avaliacoes.select_related("produto", "movimento"))
    para_avaliar = _para_avaliar(cliente)
    return {
        "pontos_por_avaliacao": regras.PONTOS_POR_AVALIACAO,
        "comentario_minimo": regras.COMENTARIO_MINIMO,
        "para_avaliar": [
            {
                "sku": linha["produto__sku"],
                "nome": linha["produto__nome"],
                "preco": float(linha["produto__preco"]),
                "foto": linha["produto__foto"],
                "ultima_compra": linha["ultima_compra"],
            }
            for linha in para_avaliar
        ],
        "avaliadas": [
            {
                "sku": a.produto.sku,
                "nome": a.produto.nome,
                "foto": a.produto.foto,
                "nota": a.nota,
                "comentario": a.comentario,
                "data": a.criada_em,
                "pontos": a.movimento.pontos,
            }
            for a in avaliadas
        ],
    }


# Feito com IA: tela de avaliações do gerente. O resumo, a distribuição das notas e a nota por produto
# consideram todas as avaliações (é o retrato do catálogo); os filtros de produto e nota valem só para
# a lista paginada, para o gerente ler os comentários de um produto ou só as notas baixas.
def avaliacoes_da_loja(produto="", nota="", pagina=1):
    todas = Avaliacao.objects.all()
    resumo = todas.aggregate(
        total=Count("id"),
        media=Avg("nota"),
        pontos=Coalesce(Sum("movimento__pontos"), 0),
    )
    por_nota = dict(todas.values_list("nota").annotate(q=Count("id")))
    por_produto = (
        todas.values("produto__sku", "produto__nome")
        .annotate(quantidade=Count("id"), media=Avg("nota"))
        .order_by("-quantidade", "produto__nome")
    )

    lista = todas.select_related("cliente", "produto").order_by("-criada_em", "-id")
    if produto:
        lista = lista.filter(produto__sku=produto)
    try:
        nota = int(nota)
    except (TypeError, ValueError):
        nota = None
    if nota is not None and regras.NOTA_MINIMA <= nota <= regras.NOTA_MAXIMA:
        lista = lista.filter(nota=nota)
    pagina_atual, paginacao = _paginar(lista, pagina)

    return {
        **paginacao,
        "resumo": {
            "total": resumo["total"],
            "media": round(resumo["media"], 1) if resumo["media"] is not None else None,
            "pontos": resumo["pontos"],
        },
        "por_nota": [
            {"nota": n, "quantidade": por_nota.get(n, 0)}
            for n in range(regras.NOTA_MAXIMA, regras.NOTA_MINIMA - 1, -1)
        ],
        "por_produto": [
            {
                "sku": linha["produto__sku"],
                "nome": linha["produto__nome"],
                "quantidade": linha["quantidade"],
                "media": round(linha["media"], 1),
            }
            for linha in por_produto
        ],
        "avaliacoes": [
            {
                "id": a.id,
                "data": a.criada_em,
                "cliente": {"id": a.cliente.id, "nome": a.cliente.nome},
                "produto": {"sku": a.produto.sku, "nome": a.produto.nome},
                "nota": a.nota,
                "comentario": a.comentario,
            }
            for a in pagina_atual
        ],
    }


DIAS_DE_GIRO = 30
_ORDEM_DA_SITUACAO = {s: i for i, s in enumerate(regras.SITUACOES_DO_ESTOQUE)}


# Feito com IA: estoque dos produtos ativos para o gerente. Os esgotados e os que estão acabando vêm
# primeiro (é o que precisa de reposição); `vendidos` (últimos 30 dias) ajuda a decidir quanto repor.
# O resumo conta o catálogo inteiro; o filtro de situação só estreita a lista.
def estoque_da_loja(situacao="", agora=None):
    agora = agora or timezone.now()
    produtos = Produto.objects.filter(ativo=True).annotate(
        vendidos=Coalesce(
            Sum("itens_vendidos__quantidade", filter=Q(itens_vendidos__compra__data__gt=agora - timedelta(days=DIAS_DE_GIRO))),
            0,
        )
    )
    linhas = [
        {
            "sku": p.sku,
            "nome": p.nome,
            "estoque": p.estoque,
            "minimo": p.estoque_minimo,
            "situacao": regras.situacao_do_estoque(p.estoque, p.estoque_minimo),
            "vendidos": p.vendidos,
        }
        for p in produtos
    ]
    linhas.sort(key=lambda linha: (_ORDEM_DA_SITUACAO[linha["situacao"]], linha["estoque"], linha["nome"]))
    resumo = {s: sum(1 for linha in linhas if linha["situacao"] == s) for s in regras.SITUACOES_DO_ESTOQUE}
    return {
        "resumo": {
            "produtos": len(linhas),
            "unidades": sum(linha["estoque"] for linha in linhas),
            "esgotados": resumo[regras.ESGOTADO],
            "acabando": resumo[regras.ACABANDO],
        },
        "dias_de_giro": DIAS_DE_GIRO,
        "produtos": [linha for linha in linhas if not situacao or linha["situacao"] == situacao],
    }
