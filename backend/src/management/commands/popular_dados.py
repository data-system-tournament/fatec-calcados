"""
Gera dados fictícios coerentes com as regras:  python manage.py popular_dados

O truque: o seed NÃO inventa pontos. Ele inventa COMPRAS (quem, onde, quando,
quanto) e passa cada uma, em ordem cronológica, por services.registrar_compra.
Então todo ponto, resgate e expiração do dashboard saiu das regras do programa.

Perfis de cliente, para os dados contarem uma história:
  vip       -> compra muito, chega a Ouro
  fiel      -> compra com frequência, fica em Prata
  ocasional -> compra pouco, fica em Bronze
  sumido    -> comprou no começo e parou; os pontos dele expiram
"""
import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from src import cpf as cpf_utils
from src import regras, services
from src.models import Cliente, Compra, Loja, MovimentoPontos

CIDADES = [
    "Araras", "Limeira", "Rio Claro", "Piracicaba", "Leme", "Pirassununga",
    "Mogi Guaçu", "Mogi Mirim", "São Carlos", "Americana", "Santa Bárbara d'Oeste", "Cordeirópolis",
]
NOMES = [
    "Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela",
    "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel",
    "Tatiane", "Vinícius", "Beatriz", "Gustavo", "Larissa", "Matheus", "Patrícia", "Rodrigo",
    "Sofia", "Thiago", "Vanessa", "Leonardo", "Juliana", "André", "Letícia", "Caio", "Renata",
]
SOBRENOMES = [
    "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida", "Lima",
    "Carvalho", "Ferreira", "Ribeiro", "Gomes", "Martins", "Barbosa", "Rocha", "Moreira", "Nunes",
]
# Preços típicos de uma loja de calçados
PRECOS = [
    Decimal(p) for p in (
        "79.90", "99.90", "129.90", "149.90", "179.90", "199.90",
        "229.90", "259.90", "299.90", "349.90", "399.90", "499.90",
    )
]
# perfil: (fatia dos clientes, peso de compras)
PERFIS = {"vip": (0.10, 6.0), "fiel": (0.30, 2.0), "ocasional": (0.40, 0.8), "sumido": (0.20, 1.5)}


class Command(BaseCommand):
    help = "Apaga os dados e gera clientes e compras fictícios passando pelas regras do programa."

    def add_arguments(self, parser):
        parser.add_argument("--clientes", type=int, default=40)
        parser.add_argument("--compras", type=int, default=420)
        parser.add_argument("--meses", type=int, default=18, help="Quantos meses de histórico gerar")
        parser.add_argument("--semente", type=int, default=2026, help="Mesma semente = mesmos dados")

    @transaction.atomic
    def handle(self, *args, **opts):
        rng = random.Random(opts["semente"])
        agora = timezone.now()
        inicio = agora - timedelta(days=30 * opts["meses"])
        dias_total = (agora - inicio).days

        MovimentoPontos.objects.all().delete()
        Compra.objects.all().delete()
        Cliente.objects.all().delete()
        Loja.objects.all().delete()

        lojas = [Loja.objects.create(nome=f"FATECalçados {c}", cidade=c) for c in CIDADES]

        # --- clientes
        perfis = []
        for perfil, (fatia, _peso) in PERFIS.items():
            perfis += [perfil] * round(fatia * opts["clientes"])
        while len(perfis) < opts["clientes"]:
            perfis.append("ocasional")
        perfis = perfis[: opts["clientes"]]
        rng.shuffle(perfis)

        nomes_usados, clientes = set(), []
        for perfil in perfis:
            while True:
                nome = f"{rng.choice(NOMES)} {rng.choice(SOBRENOMES)}"
                if nome not in nomes_usados:
                    nomes_usados.add(nome)
                    break
            if perfil == "sumido":
                dia = rng.randint(0, 90)               # entraram no começo...
                fim_ativo = dia + rng.randint(90, 160)  # ...e pararam de comprar
            else:
                dia = rng.randint(0, int(dias_total * 0.75))
                fim_ativo = dias_total
            cadastro = self._momento(inicio, dia, rng, agora)
            while True:
                try:
                    cliente = services.cadastrar_cliente(
                        cpf_utils.gerar(rng), nome, rng.choice(lojas), data=cadastro
                    )
                    break
                except services.RegraViolada:  # CPF repetido, gera outro
                    continue
            clientes.append((cliente, perfil, dia, fim_ativo))

        # --- compras (primeiro sorteamos, depois processamos em ordem de data)
        pesos = [PERFIS[perfil][1] for _c, perfil, _d, _f in clientes]
        eventos = []
        for _ in range(opts["compras"]):
            cliente, perfil, dia_ini, dia_fim = rng.choices(clientes, weights=pesos)[0]
            quando = self._momento(inicio, rng.randint(dia_ini, dia_fim), rng, agora)
            if quando < cliente.cadastrado_em:
                quando = cliente.cadastrado_em + timedelta(minutes=rng.randint(5, 60))
            loja = cliente.loja_cadastro if rng.random() < 0.7 else rng.choice(lojas)
            itens = rng.choices([1, 2, 3], weights=[80, 17, 3])[0]
            valor = sum(rng.choice(PRECOS) for _ in range(itens))
            eventos.append((quando, cliente, loja, valor))
        eventos.sort(key=lambda e: e[0])

        resgates = 0
        for quando, cliente, loja, valor in eventos:
            services.expirar_pontos(cliente, quando)
            saldo = services.saldo(cliente)
            resgate = 0
            if saldo >= 300 and rng.random() < 0.22:
                # desconto de no máximo metade da compra
                limite_por_valor = int(valor / 2 / regras.VALOR_BLOCO) * regras.BLOCO_RESGATE
                maximo = min(saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE, limite_por_valor)
                if maximo >= regras.BLOCO_RESGATE:
                    # a maioria resgata pouco de cada vez
                    opcoes = list(range(regras.BLOCO_RESGATE, maximo + 1, regras.BLOCO_RESGATE))
                    resgate = rng.choices(opcoes, weights=[1 / (i + 1) for i in range(len(opcoes))])[0]
                    resgates += 1
            services.registrar_compra(cliente.cpf, loja, valor, resgate, data=quando)

        for cliente, *_ in clientes:
            services.expirar_pontos(cliente, agora)

        if opts["verbosity"] > 0:
            self._resumo(len(clientes), len(eventos), resgates, agora)

    @staticmethod
    def _momento(inicio, dia, rng, limite):
        """Um horário de loja (10h às 20h) no dia `dia` depois de `inicio`, nunca no futuro."""
        data = timezone.localtime(inicio).date() + timedelta(days=dia)
        hora = time(rng.randint(10, 20), rng.randint(0, 59))
        momento = timezone.make_aware(datetime.combine(data, hora))
        return min(momento, limite - timedelta(minutes=1))

    def _resumo(self, n_clientes, n_compras, n_resgates, agora):
        contagem = {}
        for c in Cliente.objects.all():
            nivel = services.nivel_atual(c, agora)
            contagem[nivel] = contagem.get(nivel, 0) + 1
        self.stdout.write(self.style.SUCCESS(
            f"{n_clientes} clientes, {n_compras} compras, {n_resgates} com resgate."
        ))
        self.stdout.write(
            "Níveis hoje: " + ", ".join(
                f"{regras.nome_do_nivel(c)} {contagem.get(c, 0)}" for c, *_ in regras.NIVEIS
            )
        )
