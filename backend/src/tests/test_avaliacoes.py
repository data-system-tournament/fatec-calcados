import json
from decimal import Decimal

from django.test import TestCase

from src import regras, services
from src.models import Avaliacao, Caixa, Loja, MovimentoPontos, Produto

Tipo = MovimentoPontos.Tipo
SENHA = "sapato-azul-2026"
COMENTARIO = "Muito confortável, uso todo dia."


class AvaliacaoTest(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=self.loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"))
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"))
        self.mariana = services.cadastrar_cliente("52998224725", "Mariana Souza", self.loja)

    def comprar_no_caixa(self, sku="7890001"):
        return services.registrar_venda(self.caixa, [{"sku": sku, "quantidade": 1}], "PIX", cpf=self.mariana.cpf)

    def test_avaliar_produto_comprado_no_caixa_gera_lote_de_20_pontos(self):
        self.comprar_no_caixa()
        antes = services.saldo(self.mariana)
        avaliacao = services.avaliar_produto(self.mariana, "7890001", 5, COMENTARIO)

        self.assertEqual(services.saldo(self.mariana), antes + regras.PONTOS_POR_AVALIACAO)
        lote = avaliacao.movimento
        self.assertEqual(lote.tipo, Tipo.ACUMULO)
        self.assertIsNone(lote.compra)
        self.assertEqual(lote.restante, regras.PONTOS_POR_AVALIACAO)
        self.assertEqual(lote.expira_em, lote.data + regras.VALIDADE_PONTOS)

    def test_so_avalia_o_que_comprou(self):
        self.comprar_no_caixa("7890001")
        with self.assertRaisesMessage(services.RegraViolada, "só pode avaliar produtos que comprou"):
            services.avaliar_produto(self.mariana, "7890002", 5, COMENTARIO)
        with self.assertRaisesMessage(services.RegraViolada, "Produto não encontrado"):
            services.avaliar_produto(self.mariana, "0000000", 5, COMENTARIO)
        self.assertFalse(Avaliacao.objects.exists())

    def test_cada_produto_rende_pontos_uma_vez_mesmo_comprado_duas_vezes(self):
        self.comprar_no_caixa()
        self.comprar_no_caixa()
        services.avaliar_produto(self.mariana, "7890001", 4, COMENTARIO)
        saldo = services.saldo(self.mariana)
        with self.assertRaisesMessage(services.RegraViolada, "já avaliou"):
            services.avaliar_produto(self.mariana, "7890001", 5, COMENTARIO)
        self.assertEqual(services.saldo(self.mariana), saldo)

    def test_avaliacao_invalida_nao_grava_nada(self):
        self.comprar_no_caixa()
        movimentos = MovimentoPontos.objects.count()
        for nota, comentario in ((6, COMENTARIO), (5, "curto")):
            with self.assertRaises(services.RegraViolada):
                services.avaliar_produto(self.mariana, "7890001", nota, comentario)
        self.assertEqual(MovimentoPontos.objects.count(), movimentos)
        self.assertFalse(Avaliacao.objects.exists())

    def test_pontos_da_avaliacao_servem_no_resgate(self):
        # 80 pts da compra + 20 da avaliação fecham um bloco de 100.
        Produto.objects.create(sku="7890003", nome="Palmilha", preco=Decimal("80.00"))
        self.comprar_no_caixa("7890003")
        services.avaliar_produto(self.mariana, "7890003", 5, COMENTARIO)
        self.assertEqual(services.saldo(self.mariana), 100)
        compra = services.registrar_compra(self.mariana.cpf, self.loja, Decimal("50.00"), pontos_resgate=100)
        self.assertEqual(compra.desconto, Decimal("5.00"))


class AvaliacaoApiTest(TestCase):
    def setUp(self):
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"))
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"))
        cliente = services.cadastrar_cliente("52998224725", "Mariana Souza", loja)
        services.registrar_venda(caixa, [{"sku": "7890001", "quantidade": 1}], "PIX", cpf=cliente.cpf)
        self.post("/api/conta/cadastro/", {"cpf": cliente.cpf, "nome": "Mariana", "senha": SENHA})

    def post(self, url, dados):
        return self.client.post(url, json.dumps(dados), content_type="application/json")

    def test_sem_sessao_recebe_401(self):
        self.client.post("/api/conta/sair/")
        self.assertEqual(self.client.get("/api/conta/avaliacoes/").status_code, 401)
        self.assertEqual(self.post("/api/conta/avaliacoes/", {"sku": "7890001"}).status_code, 401)

    def test_lista_o_que_falta_avaliar_e_move_para_avaliadas(self):
        dados = self.client.get("/api/conta/avaliacoes/").json()
        self.assertEqual(dados["pontos_por_avaliacao"], regras.PONTOS_POR_AVALIACAO)
        self.assertEqual(dados["comentario_minimo"], regras.COMENTARIO_MINIMO)
        self.assertEqual([p["sku"] for p in dados["para_avaliar"]], ["7890001"])
        self.assertEqual(dados["avaliadas"], [])

        r = self.post("/api/conta/avaliacoes/", {"sku": "7890001", "nota": 5, "comentario": COMENTARIO})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["para_avaliar"], [])
        avaliada = r.json()["avaliadas"][0]
        self.assertEqual((avaliada["nome"], avaliada["nota"], avaliada["pontos"]), ("Tênis Runner", 5, 20))

    def test_erro_de_regra_vira_400_com_mensagem(self):
        r = self.post("/api/conta/avaliacoes/", {"sku": "7890002", "nota": 5, "comentario": COMENTARIO})
        self.assertEqual(r.status_code, 400)
        self.assertIn("comprou", r.json()["erro"])

    def test_extrato_mostra_de_qual_produto_veio_o_ponto(self):
        self.post("/api/conta/avaliacoes/", {"sku": "7890001", "nota": 4, "comentario": COMENTARIO})
        movimentos = self.client.get("/api/conta/").json()["movimentos"]
        self.assertEqual(movimentos[0]["avaliacao"], "Tênis Runner")
        self.assertIsNone(movimentos[-1]["avaliacao"])


class AvaliacoesDaLojaTest(TestCase):
    """Tela de avaliações do gerente (GET /api/avaliacoes/), só leitura."""

    def setUp(self):
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"))
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"))
        itens = [{"sku": "7890001", "quantidade": 1}, {"sku": "7890002", "quantidade": 1}]
        self.clientes = []
        for cpf, nome in (("52998224725", "Ana"), ("39053344705", "Bruno")):
            cliente = services.cadastrar_cliente(cpf, nome, loja)
            services.registrar_venda(caixa, itens, "PIX", cpf=cpf)
            self.clientes.append(cliente)
        ana, bruno = self.clientes
        services.avaliar_produto(ana, "7890001", 5, COMENTARIO)
        services.avaliar_produto(bruno, "7890001", 4, COMENTARIO)
        services.avaliar_produto(ana, "7890002", 2, "Furou depois de duas semanas de uso.")

    def avaliacoes(self, **filtros):
        return self.client.get("/api/avaliacoes/", filtros).json()

    def test_resumo_distribuicao_e_nota_por_produto(self):
        dados = self.avaliacoes()
        self.assertEqual(dados["resumo"], {"total": 3, "media": 3.7, "pontos": 60})
        self.assertEqual(
            [(n["nota"], n["quantidade"]) for n in dados["por_nota"]],
            [(5, 1), (4, 1), (3, 0), (2, 1), (1, 0)],
        )
        self.assertEqual(
            [(p["nome"], p["quantidade"], p["media"]) for p in dados["por_produto"]],
            [("Tênis Runner", 2, 4.5), ("Meia Esportiva", 1, 2.0)],
        )

    def test_lista_mais_recente_primeiro_com_cliente_e_produto(self):
        primeira = self.avaliacoes()["avaliacoes"][0]
        self.assertEqual(primeira["produto"]["nome"], "Meia Esportiva")
        self.assertEqual(primeira["cliente"]["nome"], "Ana")
        self.assertEqual(primeira["nota"], 2)

    def test_filtros_valem_so_para_a_lista(self):
        dados = self.avaliacoes(produto="7890001", nota="4")
        self.assertEqual([a["cliente"]["nome"] for a in dados["avaliacoes"]], ["Bruno"])
        self.assertEqual(dados["total"], 1)
        self.assertEqual(dados["resumo"]["total"], 3)
        # Nota fora de 1 a 5 é ignorada.
        self.assertEqual(self.avaliacoes(nota="9")["total"], 3)

    def test_sem_avaliacoes_media_vazia(self):
        Avaliacao.objects.all().delete()
        dados = self.avaliacoes()
        self.assertEqual(dados["resumo"], {"total": 0, "media": None, "pontos": 0})
        self.assertEqual(dados["por_produto"], [])
