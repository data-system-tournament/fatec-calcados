from datetime import timedelta
from decimal import ROUND_FLOOR, Decimal

VALIDADE_PONTOS = timedelta(days=365)
JANELA_NIVEL = timedelta(days=365)

BLOCO_RESGATE = 100
VALOR_BLOCO = Decimal("5.00")
VALOR_POR_PONTO = VALOR_BLOCO / BLOCO_RESGATE

BRONZE, PRATA, OURO = "BRONZE", "PRATA", "OURO"

NIVEIS = (
    (BRONZE, "Bronze", 0, 0),
    (PRATA, "Prata", 1000, 10),
    (OURO, "Ouro", 5000, 20),
)


# Feito com IA: o nível vem dos pontos ACUMULADOS em 12 meses, não do saldo,
# para o cliente não cair de nível ao usar os pontos.
def nivel_por_pontos(pontos_12m: int) -> str:
    nivel = BRONZE
    for codigo, _nome, minimo, _bonus in NIVEIS:
        if pontos_12m >= minimo:
            nivel = codigo
    return nivel


def nome_do_nivel(codigo: str) -> str:
    return next(nome for c, nome, _m, _b in NIVEIS if c == codigo)


def bonus_do_nivel(codigo: str) -> int:
    return next(bonus for c, _n, _m, bonus in NIVEIS if c == codigo)


# Feito com IA: pontos sobre o valor PAGO, sem os centavos; o bônus do nível
# é aplicado sobre essa base e arredonda para baixo (ex.: R$ 489,60 Prata -> 489 * 110 // 100 = 537).
def calcular_pontos(valor_pago: Decimal, nivel: str) -> int:
    base = int(Decimal(valor_pago).to_integral_value(rounding=ROUND_FLOOR))
    if base <= 0:
        return 0
    return base * (100 + bonus_do_nivel(nivel)) // 100


def desconto_do_resgate(pontos: int) -> Decimal:
    return (Decimal(pontos) * VALOR_POR_PONTO).quantize(Decimal("0.01"))


def proximo_nivel(pontos_12m: int):
    for _codigo, nome, minimo, _bonus in NIVEIS:
        if pontos_12m < minimo:
            return nome, minimo - pontos_12m
    return None

