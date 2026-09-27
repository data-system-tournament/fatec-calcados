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


# Feito com IA: estoque sem separar por loja. Calçado tem estoque por numeração (cada número é uma
# quantidade); acessório (meia, palmilha) tem um número só. O gerente define o mínimo de cada produto: no
# calçado ele vale para cada numeração. No mínimo ou abaixo dele, está acabando e precisa de reposição.
ESGOTADO, ACABANDO, EM_DIA = "ESGOTADO", "ACABANDO", "OK"
SITUACOES_DO_ESTOQUE = (ESGOTADO, ACABANDO, EM_DIA)
ESTOQUE_MINIMO_PADRAO = 5
ESTOQUE_MINIMO_POR_NUMERACAO = 2


def situacao_do_estoque(quantidade: int, minimo: int) -> str:
    if quantidade <= 0:
        return ESGOTADO
    if quantidade <= minimo:
        return ACABANDO
    return EM_DIA


# Situação de um calçado pela grade de numerações: esgotado quando não sobrou nenhum par; acabando quando
# alguma numeração zerou ou chegou ao mínimo (o cliente daquele número já não acha o calçado).
def situacao_da_grade(quantidades: list[int], minimo: int) -> str:
    if sum(quantidades) <= 0:
        return ESGOTADO
    if any(q <= minimo for q in quantidades):
        return ACABANDO
    return EM_DIA


# Numeração de um item de venda ou de contagem: obrigatória no calçado (tabela brasileira, a mesma faixa do
# perfil) e proibida no acessório, que não tem número. Devolve o motivo de não valer, ou None.
def problema_da_numeracao(usa_numeracao: bool, numeracao) -> str | None:
    if not usa_numeracao:
        return None if numeracao is None else "Esse produto não tem numeração."
    if numeracao is None:
        return "Escolha a numeração do calçado."
    if type(numeracao) is not int or not NUMERACAO_MINIMA <= numeracao <= NUMERACAO_MAXIMA:
        return f"Escolha uma numeração de {NUMERACAO_MINIMA} a {NUMERACAO_MAXIMA}."
    return None


# Devolve o motivo de a contagem não valer, ou None. `type(...) is int` recusa True/False e 4.5.
def problema_do_estoque(quantidade, minimo) -> str | None:
    if type(quantidade) is not int or quantidade < 0:
        return "Informe a quantidade em estoque (zero ou mais)."
    if type(minimo) is not int or minimo < 0:
        return "Informe o estoque mínimo (zero ou mais)."
    return None


# Feito com IA: exclusão de conta (LGPD). O cadastro não pode ser apagado de verdade, porque as vendas
# (que a loja precisa guardar) e o livro-razão de pontos apontam para ele; então os dados pessoais são
# trocados por estes. O "CPF" começa com X: nunca coincide com um CPF de verdade (só números), então a
# pessoa pode se cadastrar de novo, do zero, se quiser.
NOME_DE_CONTA_EXCLUIDA = "Cliente excluído"


def cpf_de_conta_excluida(cliente_id: int) -> str:
    return f"X{cliente_id:010d}"
