"""
Regras do programa de fidelidade da FATECalçados.

Tudo que é "número do regulamento" mora aqui. Se a banca perguntar
"e se o resgate passasse a valer R$ 6?", é só mudar este arquivo.

Regras do desafio:
  - 1 ponto a cada R$ 1,00 em compras
  - pontos expiram em 12 meses
  - 100 pontos = R$ 5,00 de desconto
  - Bronze 0-999 (sem bônus), Prata 1.000-4.999 (+10%), Ouro 5.000+ (+20%)

Decisões da equipe (o PDF não define, então escolhemos e justificamos):
  1. O nível é calculado pelos pontos ACUMULADOS nos últimos 12 meses,
     não pelo saldo. Assim o cliente não é rebaixado por resgatar.
  2. O bônus usa o nível que o cliente tinha ANTES da compra.
  3. Pontos são calculados sobre o valor PAGO (depois do desconto do resgate).
  4. Centavos são descartados: R$ 489,60 vira 489 pontos-base.
     O bônus é aplicado sobre essa base e o resultado é arredondado para baixo.
  5. Resgate só em múltiplos de 100 pontos.
  6. O resgate consome primeiro os pontos mais antigos (FIFO), e cada
     lote de pontos vence 12 meses depois da compra que o gerou.
"""
from datetime import timedelta
from decimal import ROUND_FLOOR, Decimal

VALIDADE_PONTOS = timedelta(days=365)
JANELA_NIVEL = timedelta(days=365)

BLOCO_RESGATE = 100                    # resgate em múltiplos de 100 pontos
VALOR_BLOCO = Decimal("5.00")          # 100 pontos = R$ 5,00
VALOR_POR_PONTO = VALOR_BLOCO / BLOCO_RESGATE   # R$ 0,05 por ponto

BRONZE, PRATA, OURO = "BRONZE", "PRATA", "OURO"

# (código, nome, pontos mínimos nos últimos 12 meses, bônus em %)
# Ordem: do menor para o maior.
NIVEIS = (
    (BRONZE, "Bronze", 0, 0),
    (PRATA, "Prata", 1000, 10),
    (OURO, "Ouro", 5000, 20),
)


def nivel_por_pontos(pontos_12m: int) -> str:
    """Devolve o código do nível para uma quantidade de pontos acumulados em 12 meses."""
    nivel = BRONZE
    for codigo, _nome, minimo, _bonus in NIVEIS:
        if pontos_12m >= minimo:
            nivel = codigo
    return nivel


def nome_do_nivel(codigo: str) -> str:
    return next(nome for c, nome, _m, _b in NIVEIS if c == codigo)


def bonus_do_nivel(codigo: str) -> int:
    return next(bonus for c, _n, _m, bonus in NIVEIS if c == codigo)


def calcular_pontos(valor_pago: Decimal, nivel: str) -> int:
    """
    Pontos ganhos numa compra.
    Ex.: R$ 489,60 -> base 489. Prata (+10%): 489 * 110 // 100 = 537.
    Usamos só inteiros depois da base para não ter erro de ponto flutuante.
    """
    base = int(Decimal(valor_pago).to_integral_value(rounding=ROUND_FLOOR))
    if base <= 0:
        return 0
    return base * (100 + bonus_do_nivel(nivel)) // 100


def desconto_do_resgate(pontos: int) -> Decimal:
    """300 pontos -> R$ 15,00."""
    return (Decimal(pontos) * VALOR_POR_PONTO).quantize(Decimal("0.01"))


def proximo_nivel(pontos_12m: int):
    """
    Devolve (nome_do_proximo_nivel, pontos_que_faltam) ou None se já é Ouro.
    """
    for _codigo, nome, minimo, _bonus in NIVEIS:
        if pontos_12m < minimo:
            return nome, minimo - pontos_12m
    return None
