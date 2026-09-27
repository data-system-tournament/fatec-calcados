import heapq
import itertools
import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from src import cpf as cpf_utils
from src import regras, services
from src.models import (
    Avaliacao, Caixa, Cliente, Compra, EstoqueNumeracao, FormaPagamento, Loja, MovimentoPontos, Produto,
)

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
# Feito com IA: fotos ilustrativas do Unsplash, todas na licença Unsplash (uso livre, inclusive comercial, sem
# atribuição obrigatória; conferido pelo link de download, que só leva a images.unsplash.com nas fotos livres e
# manda as pagas do Unsplash+ para plus.unsplash.com). Os tênis usam as mesmas fotos da landing
# (frontend/src/pages/inicio/fotos.ts). Cada uma foi escolhida pelo que o nome do produto diz, evitando marca à
# mostra. A Palmilha Gel não tem foto livre no Unsplash: a dela é do Pixabay (licença Pixabay, também de uso livre
# e sem atribuição), por isso vai com o endereço inteiro.
# O comentário traz o endereço da página da foto (unsplash.com/photos/<código>), para achar a original.
FOTOS = {
    "7890001": "1606107557195-0e29a4b5b4aa",  # Tênis Runner: treino verde-limão
    "7890002": "1608231387042-66d1773070a5",  # Tênis Casual Branco: casual branco de couro
    "7890003": "1549298916-b41d501d3772",  # Tênis Skate: caramelo de lona
    "7890004": "1560769629-975ec94e6a86",  # Tênis Infantil Luz: dois tênis coloridos
    "7890005": "1613662632164-7f2b081a5b46",  # Sandália Couro: caramelo de tiras largas (b_k6k7McqcE)
    "7890006": "1562273138-f46be4ebdf33",  # Sandália Plataforma: vinho de sola alta (DDqxX0-7vKE)
    "7890007": "1608256246200-53e635b5b65f",  # Bota Couro: marrom de amarrar (esxf7PJmExQ)
    "7890008": "1613673720017-56e42d90fee4",  # Bota Coturno: coturno preto (9WIgbViemds)
    "7890009": "1552422554-0d5af0c79fc6",  # Sapato Social: oxford preto (RnPqv7KkKBU)
    "7890010": "1775297832774-9eb647970c68",  # Sapatilha Bailarina: amarela na grama (xgkWcR-ehEo)
    "7890011": "1616406432452-07bc5938759d",  # Mocassim: marrom com fivela (LkuH3Txi_gs)
    "7890012": "1535043934128-cf0b28d52f95",  # Scarpin: branco de salto fino (Zx76sbAndc0)
    "7890013": "1620288091141-71640b6cd6f4",  # Chinelo Slide: azul e branco na grama (yQY7fyckKk8)
    "7890014": "1605408499391-6368c628ef42",  # Tênis Corrida Pro: treino preto
    "7890015": "1615486364462-ef6363adbc18",  # Meia Esportiva (kit): três meias coloridas (YHmZBuNCLvQ)
    # Palmilha Gel: par de palmilhas de calcanhar, uma mostrando o lado de gel
    # (pixabay.com/photos/insoles-shoes-black-shoe-insoles-1194948/)
    "7890016": "https://cdn.pixabay.com/photo/2016/02/11/23/04/deposits-1194948_640.jpg",
}


def _url_da_foto(sku):
    foto = FOTOS.get(sku, "")
    if not foto or foto.startswith("https://"):
        return foto
    return f"https://images.unsplash.com/photo-{foto}?w=600&q=80&fm=jpg&fit=max"


# Feito com IA: grade de numerações de cada calçado (os acessórios, meia e palmilha, ficam de fora e têm um
# estoque só). Adulto do 34 ao 44; modelos femininos do 33 ao 40; masculinos sociais do 37 ao 44; infantil do
# 24 ao 33.
ADULTO, FEMININO, MASCULINO, INFANTIL = range(34, 45), range(33, 41), range(37, 45), range(24, 34)
NUMERACOES = {
    "7890001": ADULTO, "7890002": ADULTO, "7890003": ADULTO, "7890004": INFANTIL,
    "7890005": FEMININO, "7890006": FEMININO, "7890007": ADULTO, "7890008": ADULTO,
    "7890009": MASCULINO, "7890010": FEMININO, "7890011": MASCULINO, "7890012": FEMININO,
    "7890013": ADULTO, "7890014": ADULTO,
}

# Texto da aba Descrição da página do produto. Só descreve o que a foto e o nome já dizem (material, uso);
# não inventa tecnologia, garantia nem marca.
DESCRICOES = {
    "7890001": "Tênis de treino leve, com cabedal em tecido respirável e solado de borracha que amortece a pisada. "
               "Bom para caminhada, academia e o dia a dia.",
    "7890002": "Tênis casual branco em couro sintético, com palmilha acolchoada e solado de borracha. Combina com "
               "jeans, bermuda e roupa social mais leve.",
    "7890003": "Tênis de lona com biqueira reforçada e solado plano de borracha, pensado para o skate e para o uso "
               "de todo dia.",
    "7890004": "Tênis infantil colorido, com fechamento em velcro para a criança calçar sozinha e solado flexível "
               "que acompanha o pé em crescimento.",
    "7890005": "Sandália de couro com tiras largas cruzadas e palmilha anatômica. Confortável para o calor e "
               "fácil de combinar.",
    "7890006": "Sandália com plataforma de sola alta e leve, tira cruzada na frente e fivela no tornozelo para "
               "firmar o pé.",
    "7890007": "Bota de couro de cano curto com cadarço, forro macio e solado tratorado que segura bem no chão "
               "molhado.",
    "7890008": "Coturno preto de amarrar, cano médio, com zíper lateral para calçar rápido e solado robusto.",
    "7890009": "Sapato social oxford em couro, com cadarço fino, forro interno e solado de borracha antiderrapante "
               "para o trabalho e eventos.",
    "7890010": "Sapatilha bailarina de bico arredondado, leve e flexível, com palmilha acolchoada para usar o dia "
               "inteiro.",
    "7890011": "Mocassim de couro com detalhe de fivela metálica no peito do pé. Sem cadarço, calça e descalça "
               "fácil.",
    "7890012": "Scarpin de bico fino e salto alto, com palmilha acolchoada no calcanhar. Para festas e ocasiões "
               "formais.",
    "7890013": "Chinelo slide com tira larga e palmilha de borracha macia. Seca rápido: bom para piscina e praia.",
    "7890014": "Tênis de corrida com entressola de amortecimento, cabedal em malha respirável e solado de borracha "
               "com boa tração.",
    "7890015": "Kit com três pares de meias de algodão, com punho elástico e reforço no calcanhar e na ponta. "
               "Tamanho único, do 35 ao 43.",
    "7890016": "Par de palmilhas de gel que amortecem o impacto no calcanhar. Dá para recortar no tamanho do "
               "calçado.",
}

# Comentários das avaliações do seed, por nota (todas com pelo menos regras.COMENTARIO_MINIMO caracteres).
COMENTARIOS = {
    5: [
        "Muito confortável, uso o dia inteiro sem incomodar.",
        "Chegou certinho no meu número e o acabamento é ótimo.",
        "Superou o que eu esperava, já quero outra cor.",
        "Ótimo custo-benefício, recomendo para todo mundo.",
    ],
    4: [
        "Gostei bastante, só achei a forma um pouco justa.",
        "Bonito e confortável, demorou uns dias para amaciar.",
        "Bom produto, o tamanho veio certo e o material é bom.",
    ],
    3: [
        "É bom, mas esperava um material um pouco melhor.",
        "Confortável, porém esquenta bastante no calor.",
    ],
    2: ["A forma é pequena, precisei trocar por um número maior."],
    1: ["Não gostei, descolou a sola depois de poucas semanas."],
}
PESOS_DAS_NOTAS = {5: 45, 4: 30, 3: 13, 2: 7, 1: 5}


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

        # Avaliações antes dos movimentos: cada uma protege o lote de pontos que rendeu.
        Avaliacao.objects.all().delete()
        MovimentoPontos.objects.all().delete()
        Compra.objects.all().delete()
        Caixa.objects.all().delete()
        User.objects.filter(cliente__isnull=False, is_staff=False).delete()
        Cliente.objects.all().delete()
        Produto.objects.all().delete()
        Loja.objects.all().delete()

        lojas = [Loja.objects.create(nome=f"FATECalçados {c}", cidade=c) for c in CIDADES]
        caixas = {
            loja.id: Caixa.objects.create(codigo=f"{slugify(loja.cidade)}-01", nome="Caixa 01", loja=loja)
            for loja in lojas
        }
        produtos = [
            Produto.objects.create(
                sku=sku, nome=nome, preco=Decimal(preco), foto=_url_da_foto(sku), descricao=DESCRICOES[sku],
                usa_numeracao=sku in NUMERACOES,
                estoque_minimo=regras.ESTOQUE_MINIMO_POR_NUMERACAO if sku in NUMERACOES else regras.ESTOQUE_MINIMO_PADRAO,
            )
            for sku, nome, preco in PRODUTOS
        ]
        # A grade começa zerada: as vendas do histórico descontam (e param no zero) e a contagem de hoje,
        # no fim, põe a quantidade de verdade de cada número.
        EstoqueNumeracao.objects.bulk_create([
            EstoqueNumeracao(produto=p, numeracao=n, quantidade=0) for p in produtos for n in NUMERACOES.get(p.sku, [])
        ])

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
        # Feito com IA: avaliações pendentes (data, ordem, cliente, sku), numa fila por data. Parte das compras
        # com CPF vira uma avaliação uns dias depois, que passa pelo services.avaliar_produto como a do site
        # (rende os pontos e respeita "só avalia o que comprou, uma vez"); roda na ordem das datas, junto com
        # as vendas, para o saldo de cada venda já contar os pontos das avaliações de antes.
        avaliacoes, ordem = [], itertools.count()
        for quando, cliente, loja in eventos:
            self._avaliar_ate(quando, avaliacoes, rng)
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
            if rng.random() < 0.3:
                avaliado = rng.choice(itens)["sku"]
                heapq.heappush(
                    avaliacoes, (quando + timedelta(days=rng.randint(2, 20)), next(ordem), cliente, avaliado)
                )

        self._avaliar_ate(agora, avaliacoes, rng)
        for cliente, *_ in clientes:
            services.expirar_pontos(cliente, agora)

        # Feito com IA: contagem de hoje, feita depois das vendas (que já tiraram do estoque) e passando
        # pelo mesmo ajuste da tela Estoque. Sai do fim do sorteio para não mudar os dados de antes. A
        # mistura garante o que a tela precisa mostrar: um calçado esgotado em todos os números, números
        # soltos zerados ou no mínimo, e um acessório acabando.
        calcados = [p for p in produtos if p.usa_numeracao]
        esgotado = rng.choice(calcados)
        for produto in produtos:
            if not produto.usa_numeracao:
                quantidade = 3 if produto.sku == "7890016" else rng.randint(20, 60)
                services.ajustar_estoque(produto.sku, quantidade, regras.ESTOQUE_MINIMO_PADRAO)
                continue
            grade = list(NUMERACOES[produto.sku])
            contagem = {n: 0 if produto is esgotado else rng.randint(3, 12) for n in grade}
            # Uns 4 em cada 10 calçados ficam com um ou dois números zerados ou no mínimo; os outros, em dia.
            if produto is not esgotado and rng.random() < 0.4:
                for numeracao in rng.sample(grade, rng.randint(1, 2)):
                    contagem[numeracao] = rng.choice([0, 1, 2])
            for numeracao, quantidade in contagem.items():
                services.ajustar_estoque(produto.sku, quantidade, regras.ESTOQUE_MINIMO_POR_NUMERACAO, numeracao)

        if opts["verbosity"] > 0:
            self._resumo(len(clientes), len(eventos), resgates, agora)
            self.stdout.write(f"Caixa para testar o PDV: {caixas[lojas[0].id].codigo}")

    # O calçado sai com uma numeração da grade dele, mais os números do meio (como numa loja de verdade).
    @staticmethod
    def _sortear_itens(produtos, rng):
        quantos = rng.choices([1, 2, 3], weights=[80, 17, 3])[0]
        escolhidos = rng.sample(produtos, quantos)
        itens = []
        for p in escolhidos:
            item = {"sku": p.sku, "quantidade": rng.choices([1, 2], weights=[90, 10])[0]}
            if p.sku in NUMERACOES:
                grade = list(NUMERACOES[p.sku])
                meio = (len(grade) - 1) / 2
                item["numeracao"] = rng.choices(grade, weights=[meio + 1 - abs(i - meio) for i in range(len(grade))])[0]
            itens.append(item)
        return itens

    # Grava as avaliações pendentes com data até `limite`. Um cliente que comprou o mesmo produto duas vezes
    # só avalia uma: a segunda tentativa é recusada pelo service e fica de fora.
    @staticmethod
    def _avaliar_ate(limite, avaliacoes, rng):
        while avaliacoes and avaliacoes[0][0] <= limite:
            data, _ordem, cliente, sku = heapq.heappop(avaliacoes)
            nota = rng.choices(list(PESOS_DAS_NOTAS), weights=list(PESOS_DAS_NOTAS.values()))[0]
            try:
                services.avaliar_produto(cliente, sku, nota, rng.choice(COMENTARIOS[nota]), data=data)
            except services.RegraViolada:
                pass

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
