import random


def limpar(cpf) -> str:
    return "".join(c for c in str(cpf or "") if c.isdigit())


# Feito com IA: dígito verificador do CPF (pesos 10..2 para o 1º dígito e 11..2 para o 2º).
def _digito(numeros: list[int]) -> int:
    peso_inicial = len(numeros) + 1
    soma = sum(n * (peso_inicial - i) for i, n in enumerate(numeros))
    resto = (soma * 10) % 11
    return 0 if resto == 10 else resto


def validar(cpf) -> bool:
    c = limpar(cpf)
    if len(c) != 11 or c == c[0] * 11:
        return False
    numeros = [int(x) for x in c]
    return _digito(numeros[:9]) == numeros[9] and _digito(numeros[:10]) == numeros[10]


def formatar(cpf) -> str:
    c = limpar(cpf)
    return f"{c[:3]}.{c[3:6]}.{c[6:9]}-{c[9:]}" if len(c) == 11 else c


def mascarar(cpf) -> str:
    c = limpar(cpf)
    return f"***.{c[3:6]}.{c[6:9]}-**" if len(c) == 11 else "***"


def gerar(rng: random.Random) -> str:
    while True:
        numeros = [rng.randint(0, 9) for _ in range(9)]
        if len(set(numeros)) > 1:
            break
    numeros.append(_digito(numeros))
    numeros.append(_digito(numeros))
    return "".join(map(str, numeros))
