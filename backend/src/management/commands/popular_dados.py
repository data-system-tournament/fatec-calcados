import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from src import cpf as cpf_utils
from src import regras, services
from src.models import Caixa, Cliente, Compra, FormaPagamento, Loja, MovimentoPontos, Produto

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
PRODUTOS = [
    ("7890001", "Tênis Runner", "289.90"),
    ("7890002", "Tênis Casual Branco", "229.90"),
    ("7890003", "Tênis Skate", "199.90"),
    ("7890004", "Tênis Infantil Luz", "149.90"),
    ("7890005", "Sandália Couro", "159.90"),
    ("7890006", "Sandália Plataforma", "179.90"),
    ("7890007", "Bota Couro", "349.90"),
    ("7890008", "Bota Coturno", "399.90"),
    ("7890009", "Sapato Social", "299.90"),
    ("7890010", "Sapatilha Bailarina", "129.90"),
    ("7890011", "Mocassim", "259.90"),
    ("7890012", "Scarpin", "249.90"),
    ("7890013", "Chinelo Slide", "59.90"),
    ("7890014", "Tênis Corrida Pro", "499.90"),
    ("7890015", "Meia Esportiva (kit)", "39.90"),
    ("7890016", "Palmilha Gel", "34.90"),
]
PAGAMENTOS = {
    FormaPagamento.PIX: 40,
    FormaPagamento.CREDITO: 30,
    FormaPagamento.DEBITO: 18,
    FormaPagamento.DINHEIRO: 12,
}
PERFIS = {"vip": (0.10, 6.0), "fiel": (0.30, 2.0), "ocasional": (0.40, 0.8), "sumido": (0.20, 1.5)}


# Feito com IA: o seed não inventa pontos. Gera vendas (cliente, loja, data, produtos) com perfis
# de cliente (vip, fiel, ocasional, sumido) e passa cada uma, em ordem de data, por services.registrar_venda.
# Mesma --semente gera sempre os mesmos dados.
class Command(BaseCommand):
    help = "Apaga os dados e gera clientes e compras fictícios passando pelas regras do programa."

    def add_arguments(self, parser):
        parser.add_argument("--clientes", type=int, default=40)
        parser.add_argument("--compras", type=int, default=420, help="Compras com CPF")
        parser.add_argument("--sem-cpf", type=int, default=None, help="Vendas sem CPF (padrão: 1/4 das compras)")
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
        Caixa.objects.all().delete()
        Cliente.objects.all().delete()
        Produto.objects.all().delete()
        Loja.objects.all().delete()

        lojas = [Loja.objects.create(nome=f"FATECalçados {c}", cidade=c) for c in CIDADES]
        caixas = {
            loja.id: Caixa.objects.create(codigo=f"{slugify(loja.cidade)}-01", nome="Caixa 01", loja=loja)
            for loja in lojas
        }
        produtos = [
            Produto.objects.create(sku=sku, nome=nome, preco=Decimal(preco))
            for sku, nome, preco in PRODUTOS
        ]

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
                dia = rng.randint(0, 90)
                fim_ativo = dia + rng.randint(90, 160)
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
                except services.RegraViolada:
                    continue
            clientes.append((cliente, perfil, dia, fim_ativo))

        pesos = [PERFIS[perfil][1] for _c, perfil, _d, _f in clientes]
        eventos = []
        for _ in range(opts["compras"]):
            cliente, perfil, dia_ini, dia_fim = rng.choices(clientes, weights=pesos)[0]
            quando = self._momento(inicio, rng.randint(dia_ini, dia_fim), rng, agora)
            if quando < cliente.cadastrado_em:
                quando = cliente.cadastrado_em + timedelta(minutes=rng.randint(5, 60))
            loja = cliente.loja_cadastro if rng.random() < 0.7 else rng.choice(lojas)
            eventos.append((quando, cliente, loja))

        sem_cpf = opts["sem_cpf"] if opts["sem_cpf"] is not None else opts["compras"] // 4
        for _ in range(sem_cpf):
            quando = self._momento(inicio, rng.randint(0, dias_total), rng, agora)
            eventos.append((quando, None, rng.choice(lojas)))

        eventos.sort(key=lambda e: e[0])

        precos = {p.sku: p.preco for p in produtos}
        resgates = 0
        for quando, cliente, loja in eventos:
            itens = self._sortear_itens(produtos, rng)
            forma = rng.choices(list(PAGAMENTOS), weights=list(PAGAMENTOS.values()))[0]

            if cliente is None:
                services.registrar_venda(caixas[loja.id], itens, forma, data=quando)
                continue

            valor = sum(precos[item["sku"]] * item["quantidade"] for item in itens)
            services.expirar_pontos(cliente, quando)
            saldo = services.saldo(cliente)
            resgate = 0
            if saldo >= 300 and rng.random() < 0.22:
                limite_por_valor = int(valor / 2 / regras.VALOR_BLOCO) * regras.BLOCO_RESGATE
                maximo = min(saldo // regras.BLOCO_RESGATE * regras.BLOCO_RESGATE, limite_por_valor)
                if maximo >= regras.BLOCO_RESGATE:
                    opcoes = list(range(regras.BLOCO_RESGATE, maximo + 1, regras.BLOCO_RESGATE))
                    resgate = rng.choices(opcoes, weights=[1 / (i + 1) for i in range(len(opcoes))])[0]
                    resgates += 1
            services.registrar_venda(caixas[loja.id], itens, forma, cliente.cpf, resgate, data=quando)

        for cliente, *_ in clientes:
            services.expirar_pontos(cliente, agora)

        if opts["verbosity"] > 0:
            self._resumo(len(clientes), len(eventos), resgates, agora)
            self.stdout.write(f"Caixa para testar o PDV: {caixas[lojas[0].id].codigo}")

    @staticmethod
    def _sortear_itens(produtos, rng):
        quantos = rng.choices([1, 2, 3], weights=[80, 17, 3])[0]
        escolhidos = rng.sample(produtos, quantos)
        return [{"sku": p.sku, "quantidade": rng.choices([1, 2], weights=[90, 10])[0]} for p in escolhidos]

    @staticmethod
    def _momento(inicio, dia, rng, limite):
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
            f"{n_clientes} clientes, {n_compras} vendas, {n_resgates} com resgate."
        ))
        self.stdout.write(
            "Níveis hoje: " + ", ".join(
                f"{regras.nome_do_nivel(c)} {contagem.get(c, 0)}" for c, *_ in regras.NIVEIS
            )
        )
