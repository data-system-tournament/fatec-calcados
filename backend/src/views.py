import json
from datetime import date

from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import cpf as cpf_utils
from . import acoes, indicadores, regras, services
from .models import Caixa, Cliente


ATALHOS = [("30 dias", 30), ("90 dias", 90), ("12 meses", 365)]


def _periodo_da_requisicao(request):
    try:
        inicio = date.fromisoformat(request.GET["inicio"])
        fim = date.fromisoformat(request.GET["fim"])
        if inicio > fim:
            inicio, fim = fim, inicio
        return indicadores.periodo_de_datas(inicio, fim)
    except (KeyError, ValueError):
        return indicadores.periodo_padrao()


def _dados_dashboard(request):
    inicio, fim = _periodo_da_requisicao(request)
    hoje = timezone.localdate()
    atalhos = [
        {"rotulo": rotulo, "inicio": (hoje - timezone.timedelta(days=dias - 1)).isoformat(), "fim": hoje.isoformat()}
        for rotulo, dias in ATALHOS
    ]
    return {
        "inicio": timezone.localtime(inicio).date(),
        "fim": timezone.localtime(fim).date(),
        "atalhos": atalhos,
        "base": indicadores.base_do_programa(fim),
        "pontos": indicadores.pontos_e_custo(inicio, fim),
        "ranking": indicadores.ranking(inicio, fim),
        "evolucao": indicadores.evolucao_mensal(inicio, fim),
    }


@require_GET
def api_dashboard(request):
    dados = _dados_dashboard(request)
    pontos = dados["pontos"]
    for campo in ("custo", "faturamento", "custo_sobre_faturamento", "em_aberto_reais"):
        pontos[campo] = float(pontos[campo])
    for linha in dados["ranking"]:
        linha["cpf"] = cpf_utils.mascarar(linha["cpf"])
    return JsonResponse(dados)


@require_GET
def api_acoes(request):
    return JsonResponse({"acoes": acoes.acoes_do_dia()})


def _erro(mensagem, status=400):
    return JsonResponse({"erro": mensagem}, status=status)


def _ler_json(request):
    try:
        dados = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        raise services.RegraViolada("O corpo da requisição não é um JSON válido.")
    if not isinstance(dados, dict):
        raise services.RegraViolada("Envie um objeto JSON.")
    return dados


def _buscar_caixa(codigo):
    caixa = Caixa.objects.select_related("loja").filter(codigo=codigo).first()
    if caixa is None:
        raise services.RegraViolada("Caixa não encontrado.")
    return caixa


TOLERANCIA_RELOGIO = timezone.timedelta(minutes=5)


# Feito com IA: data enviada pelo caixa (venda offline conta no horário em que aconteceu);
# recusa datas no futuro, com 5 minutos de folga para o relógio do caixa.
def _ler_data(texto):
    if not texto:
        return None
    data = parse_datetime(str(texto))
    if data is None:
        raise services.RegraViolada("Data inválida.")
    if timezone.is_naive(data):
        data = timezone.make_aware(data)
    if data > timezone.now() + TOLERANCIA_RELOGIO:
        raise services.RegraViolada("A data da venda está no futuro. Confira o relógio do caixa.")
    return data


def _cliente_json(cliente):
    services.expirar_pontos(cliente)
    saldo = services.saldo(cliente)
    nivel = services.nivel_atual(cliente)
    resgataveis = saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE
    return {
        "cpf": cliente.cpf,
        "nome": cliente.nome,
        "nivel": nivel,
        "nivel_nome": regras.nome_do_nivel(nivel),
        "bonus_percentual": regras.bonus_do_nivel(nivel),
        "saldo_pontos": saldo,
        "pontos_resgataveis": resgataveis,
        "valor_resgatavel": float(regras.desconto_do_resgate(resgataveis)),
    }


@require_GET
def api_produtos(request):
    produtos = services.buscar_produtos(request.GET.get("busca", ""))
    return JsonResponse({
        "produtos": [
            {"sku": p.sku, "nome": p.nome, "preco": float(p.preco)}
            for p in produtos
        ]
    })


@require_GET
def api_cliente(request, cpf):
    cliente = Cliente.objects.filter(cpf=cpf_utils.limpar(cpf)).first()
    if cliente is None:
        return _erro("CPF não cadastrado no programa.", status=404)
    return JsonResponse(_cliente_json(cliente))


@csrf_exempt
@require_POST
def api_cadastrar_cliente(request):
    try:
        dados = _ler_json(request)
        loja = _buscar_caixa(dados["caixa"]).loja if dados.get("caixa") else None
        cliente = services.cadastrar_cliente(dados.get("cpf"), dados.get("nome"), loja)
    except services.RegraViolada as e:
        return _erro(str(e))
    return JsonResponse(_cliente_json(cliente), status=201)


@csrf_exempt
@require_POST
def api_vendas(request):
    try:
        dados = _ler_json(request)
        compra, nova = services.registrar_venda(
            caixa=_buscar_caixa(dados.get("caixa")),
            itens=dados.get("itens"),
            forma_pagamento=dados.get("forma_pagamento"),
            cpf=dados.get("cpf"),
            pontos_resgate=dados.get("pontos_resgate", 0),
            data=_ler_data(dados.get("data")),
            id=dados.get("id"),
        )
    except services.RegraViolada as e:
        return _erro(str(e))

    resposta = {
        "id": str(compra.id),
        "valor_bruto": float(compra.valor_bruto),
        "desconto": float(compra.desconto),
        "valor_pago": float(compra.valor_pago),
        "pontos_resgatados": compra.pontos_resgatados,
        "pontos_ganhos": compra.pontos_ganhos,
        "nivel_na_compra": compra.nivel_na_compra,
        "saldo_atual": services.saldo(compra.cliente) if compra.cliente else None,
    }
    return JsonResponse(resposta, status=201 if nova else 200)

