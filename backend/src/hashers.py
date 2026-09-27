from django.contrib.auth.hashers import Argon2PasswordHasher


# Feito com IA: Argon2id com os parâmetros mínimos que a OWASP recomenda (19 MiB de memória, 2 passadas,
# paralelismo 1; Password Storage Cheat Sheet). O padrão do Django (100 MiB, paralelismo 8) conta com muitos
# núcleos e, no container de 4 CPUs, levava de 0,5 a 2,5 s por login. O nome do algoritmo continua "argon2":
# uma senha gravada com outros parâmetros é regravada com estes no próximo login.
class Argon2OWASP(Argon2PasswordHasher):
    memory_cost = 19 * 1024
    time_cost = 2
    parallelism = 1
