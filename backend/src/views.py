import json
from datetime import date

from django.contrib.auth import logout, update_session_auth_hash
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from . import cpf as cpf_utils
from . import acoes, consultas, indicadores, regras, services
from .models import Caixa, Cliente, Compra


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
        "vendas": {
            **indicadores.resumo_de_vendas(inicio, fim),
            "por_caixa": indicadores.vendas_por_caixa(inicio, fim),
            "por_pagamento": indicadores.vendas_por_pagamento(inicio, fim),
            "mais_vendidos": indicadores.produtos_mais_vendidos(inicio, fim),
        },
        "resgate_por_nivel": indicadores.resgate_por_nivel(inicio, fim),
        "ranking": indicadores.ranking(inicio, fim),
        "evolucao": indicadores.evolucao_mensal(inicio, fim),
    }


@require_GET
def api_dashboard(request):
    dados = _dados_dashboard(request)
    pontos = dados["pontos"]
    for campo in ("custo", "faturamento", "custo_sobre_faturamento", "em_aberto_reais"):
        pontos[campo] = float(pontos[campo])
    pontos["a_vencer"] = indicadores.pontos_a_vencer(timezone.now(), acoes.DIAS_PARA_VENCER)
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


def _pagina(request):
    return request.GET.get("pagina", 1)


@require_GET
def api_cliente_perfil(request, cliente_id):
    cliente = Cliente.objects.select_related("loja_cadastro").filter(id=cliente_id).first()
    if cliente is None:
        return _erro("Cliente não encontrado.", status=404)
    return JsonResponse(consultas.perfil_do_cliente(cliente))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_clientes(request):
    if request.method == "GET":
        return JsonResponse(consultas.listar_clientes(
            busca=request.GET.get("busca", ""),
            nivel=request.GET.get("nivel", ""),
            pagina=_pagina(request),
        ))
    return _cadastrar_cliente(request)


def _cadastrar_cliente(request):
    try:
        dados = _ler_json(request)
        loja = _buscar_caixa(dados["caixa"]).loja if dados.get("caixa") else None
        cliente = services.cadastrar_cliente(dados.get("cpf"), dados.get("nome"), loja)
    except services.RegraViolada as e:
        return _erro(str(e))
    return JsonResponse(_cliente_json(cliente), status=201)


def _data_opcional(texto):
    try:
        return date.fromisoformat(texto)
    except (TypeError, ValueError):
        return None


@require_GET
def api_venda_detalhe(request, compra_id):
    compra = Compra.objects.select_related("cliente", "loja", "caixa").filter(id=compra_id).first()
    if compra is None:
        return _erro("Venda não encontrada.", status=404)
    return JsonResponse(consultas.detalhe_da_venda(compra))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_vendas(request):
    if request.method == "GET":
        return JsonResponse(consultas.listar_vendas(
            inicio=_data_opcional(request.GET.get("inicio")),
            fim=_data_opcional(request.GET.get("fim")),
            caixa=request.GET.get("caixa", ""),
            pagamento=request.GET.get("pagamento", ""),
            pagina=_pagina(request),
        ))
    return _registrar_venda(request)


def _registrar_venda(request):
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
    return JsonResponse(_resposta_da_venda(compra), status=201 if nova else 200)


def _resposta_da_venda(compra):
    return {
        "id": str(compra.id),
        "valor_bruto": float(compra.valor_bruto),
        "desconto": float(compra.desconto),
        "valor_pago": float(compra.valor_pago),
        "pontos_resgatados": compra.pontos_resgatados,
        "pontos_ganhos": compra.pontos_ganhos,
        "nivel_na_compra": compra.nivel_na_compra,
        "saldo_atual": services.saldo(compra.cliente) if compra.cliente else None,
    }



# ---------- Área do cliente (/api/conta/) ----------
# Diferente das rotas da loja, estas usam o cookie de sessão do Django e por isso NÃO são csrf_exempt:
# o front lê o cookie `csrftoken` (enviado pelo GET /api/conta/) e o devolve no cabeçalho X-CSRFToken.

def _cliente_logado(request):
    if not request.user.is_authenticated:
        return None
    return Cliente.objects.select_related("loja_cadastro").filter(usuario=request.user).first()


def _sem_sessao():
    return _erro("Entre com seu CPF e senha.", status=401)


@ensure_csrf_cookie
@require_GET
def api_conta(request):
    cliente = _cliente_logado(request)
    if cliente is None:
        return _sem_sessao()
    return JsonResponse(consultas.painel_do_cliente(cliente))


@require_POST
def api_conta_cadastro(request):
    try:
        dados = _ler_json(request)
        cliente = services.criar_acesso(dados.get("cpf"), dados.get("nome"), dados.get("senha"))
        services.autenticar_cliente(request, cliente.cpf, dados.get("senha"))
    except services.RegraViolada as e:
        return _erro(str(e))
    return JsonResponse(consultas.painel_do_cliente(cliente), status=201)


@require_POST
def api_conta_entrar(request):
    try:
        dados = _ler_json(request)
        cliente = services.autenticar_cliente(request, dados.get("cpf"), dados.get("senha"))
    except services.RegraViolada as e:
        return _erro(str(e))
    return JsonResponse(consultas.painel_do_cliente(cliente))


@require_POST
def api_conta_sair(request):
    logout(request)
    return JsonResponse({})


@require_POST
def api_conta_compras(request):
    cliente = _cliente_logado(request)
    if cliente is None:
        return _sem_sessao()
    try:
        dados = _ler_json(request)
        compra, nova = services.comprar_online(
            cliente,
            itens=dados.get("itens"),
            forma_pagamento=dados.get("forma_pagamento"),
            pontos_resgate=dados.get("pontos_resgate", 0),
            id=dados.get("id"),
        )
    except services.RegraViolada as e:
        return _erro(str(e))
    if compra.cliente_id != cliente.id:
        return _erro("Compra não encontrada.", status=404)
    return JsonResponse(_resposta_da_venda(compra), status=201 if nova else 200)


@require_GET
def api_conta_compra_detalhe(request, compra_id):
    cliente = _cliente_logado(request)
    if cliente is None:
        return _sem_sessao()
    compra = cliente.compras.select_related("cliente", "loja", "caixa").filter(id=compra_id).first()
    if compra is None:
        return _erro("Compra não encontrada.", status=404)
    return JsonResponse(consultas.detalhe_da_venda(compra))


@require_POST
def api_conta_senha(request):
    cliente = _cliente_logado(request)
    if cliente is None:
        return _sem_sessao()
    try:
        dados = _ler_json(request)
        usuario = services.alterar_senha(cliente, dados.get("senha_atual"), dados.get("nova_senha"))
    except services.RegraViolada as e:
        return _erro(str(e))
    # Sem isso a troca de senha encerraria a sessão atual.
    update_session_auth_hash(request, usuario)
    return JsonResponse({})
