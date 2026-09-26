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


# Feito com IA: faixa de pontos (12 meses) que corresponde a um nível, para filtrar clientes por nível
# no banco: `minimo <= pontos < limite` (limite None = sem teto, o último nível).
def faixa_do_nivel(codigo: str):
    for i, (c, _nome, minimo, _bonus) in enumerate(NIVEIS):
        if c == codigo:
            limite = NIVEIS[i + 1][2] if i + 1 < len(NIVEIS) else None
            return minimo, limite
    raise ValueError(f"Nível desconhecido: {codigo}")



# Feito com IA: avaliação de produto. Quem comprou um produto (no caixa ou na loja online) avalia cada
# produto uma vez e ganha estes pontos, num lote com a mesma validade de uma compra. O comentário mínimo
# evita avaliações vazias feitas só pelos pontos.
PONTOS_POR_AVALIACAO = 20
NOTA_MINIMA, NOTA_MAXIMA = 1, 5
COMENTARIO_MINIMO = 20


# Devolve o motivo de a avaliação não valer, ou None se estiver certa. `type(...) is int` recusa
# True/False e 4.5, que o JSON também aceita.
def problema_da_avaliacao(nota, comentario) -> str | None:
    if type(nota) is not int or not NOTA_MINIMA <= nota <= NOTA_MAXIMA:
        return f"Escolha uma nota de {NOTA_MINIMA} a {NOTA_MAXIMA} estrelas."
    if not isinstance(comentario, str) or len(comentario.strip()) < COMENTARIO_MINIMO:
        return f"Conte um pouco mais sobre o produto: pelo menos {COMENTARIO_MINIMO} caracteres."
    return None


# Feito com IA: dados que o cliente completa no perfil, os dois opcionais. A numeração cobre do infantil
# ao adulto na tabela brasileira; o nascimento não pode ser no futuro nem de alguém com mais de 120 anos.
NUMERACAO_MINIMA, NUMERACAO_MAXIMA = 16, 48
IDADE_MAXIMA = 120


# Devolve o motivo de os dados não valerem, ou None. `nascimento` já chega como date (ou None).
def problema_do_perfil(numeracao, nascimento, hoje) -> str | None:
    if numeracao is not None and (type(numeracao) is not int or not NUMERACAO_MINIMA <= numeracao <= NUMERACAO_MAXIMA):
        return f"Escolha uma numeração de {NUMERACAO_MINIMA} a {NUMERACAO_MAXIMA}."
    if nascimento is not None and (nascimento > hoje or nascimento.year < hoje.year - IDADE_MAXIMA):
        return "Confira a data de nascimento."
    return None
