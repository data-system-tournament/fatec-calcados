import json
from datetime import date

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import cpf as cpf_utils
from . import indicadores, regras, services
from .models import Cliente, Loja


# ---------------------------------------------------------- dashboard gerencial (React)

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


# ---------------------------------------------------------- página do cliente
# Ainda sem endpoint: será usado pela API da página do cliente no React.

def _resumo_cliente(cliente):
    agora = timezone.now()
    services.expirar_pontos(cliente, agora)
    p12 = services.pontos_12m(cliente, agora)
    nivel = regras.nivel_por_pontos(p12)
    saldo = services.saldo(cliente)
    a_vencer, vence_em = services.pontos_a_vencer(cliente, dias=60)
    proximo = regras.proximo_nivel(p12)
    progresso = None
    if proximo:
        minimo_atual = next(m for c, _n, m, _b in regras.NIVEIS if c == nivel)
        faixa = (p12 + proximo[1]) - minimo_atual
        progresso = round(100 * (p12 - minimo_atual) / faixa)
    return {
        "cliente": cliente,
        "nivel": nivel,
        "nivel_nome": regras.nome_do_nivel(nivel),
        "bonus": regras.bonus_do_nivel(nivel),
        "saldo": saldo,
        "saldo_reais": regras.desconto_do_resgate(saldo),
        "pode_resgatar": saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE,
        "pontos_12m": p12,
        "proximo": proximo,
        "progresso": progresso,
        "a_vencer": a_vencer,
        "vence_em": vence_em,
        "movimentos": cliente.movimentos.select_related("compra__loja").order_by("-data", "-id")[:12],
    }


@require_GET
def api_dashboard(request):
    dados = _dados_dashboard(request)
    pontos = dados["pontos"]
    for campo in ("custo", "faturamento", "custo_sobre_faturamento", "em_aberto_reais"):
        pontos[campo] = float(pontos[campo])
    for linha in dados["ranking"]:
        linha["cpf"] = cpf_utils.mascarar(linha["cpf"])  # LGPD: o CPF completo não sai do servidor
    return JsonResponse(dados)


# ---------------------------------------------------------- API para o PDV
# É por aqui que um PDV (como o USE) se conectaria ao programa.

@require_GET
def api_cliente(request, cpf):
    cliente = Cliente.objects.filter(cpf=cpf_utils.limpar(cpf)).first()
    if cliente is None:
        return JsonResponse({"erro": "CPF não cadastrado no programa."}, status=404)
    services.expirar_pontos(cliente)
    saldo = services.saldo(cliente)
    nivel = services.nivel_atual(cliente)
    return JsonResponse(
        {
            "cpf": cliente.cpf,
            "nome": cliente.nome,
            "nivel": nivel,
            "bonus_percentual": regras.bonus_do_nivel(nivel),
            "saldo_pontos": saldo,
            "pontos_resgataveis": saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE,
            "valor_resgatavel": str(regras.desconto_do_resgate(saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE)),
        }
    )


@csrf_exempt  # simplificação para o desafio; em produção, autenticar o PDV com token
@require_POST
def api_compras(request):
    try:
        dados = json.loads(request.body or b"{}")
        loja = Loja.objects.get(pk=dados["loja_id"])
        compra = services.registrar_compra(
            cpf=dados["cpf"],
            loja=loja,
            valor_bruto=dados["valor"],
            pontos_resgate=dados.get("pontos_resgate", 0),
        )
    except (json.JSONDecodeError, KeyError):
        return JsonResponse({"erro": "Envie cpf, loja_id e valor."}, status=400)
    except Loja.DoesNotExist:
        return JsonResponse({"erro": "Loja não encontrada."}, status=400)
    except services.RegraViolada as e:
        return JsonResponse({"erro": str(e)}, status=400)

    return JsonResponse(
        {
            "compra_id": str(compra.id),
            "nivel_na_compra": compra.nivel_na_compra,
            "valor_bruto": str(compra.valor_bruto),
            "desconto": str(compra.desconto),
            "valor_pago": str(compra.valor_pago),
            "pontos_ganhos": compra.pontos_ganhos,
            "pontos_resgatados": compra.pontos_resgatados,
            "saldo_atual": services.saldo(compra.cliente),
        },
        status=201,
    )
