import json
import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from src import consultas, regras, services
from src.models import Caixa, Loja, Produto
from src.tests.apoio import entrar_como_equipe


class EstoqueTest(TestCase):
    def setUp(self):
        entrar_como_equipe(self.client)
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"), estoque=10)
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"), estoque=3)
        Produto.objects.create(sku="7890003", nome="Bota Couro", preco=Decimal("349.90"), estoque=0)
        Produto.objects.create(sku="7890004", nome="Bota Antiga", preco=Decimal("99.90"), ativo=False)
        services.cadastrar_cliente("52998224725", "Mariana Souza", loja)

    def estoque(self, sku):
        return Produto.objects.get(sku=sku).estoque

    def vender(self, itens, **campos):
        return services.registrar_venda(self.caixa, itens, "PIX", **campos)

    def test_venda_tira_do_estoque(self):
        self.vender([{"sku": "7890001", "quantidade": 2}, {"sku": "7890002", "quantidade": 1}], cpf="52998224725")
        self.assertEqual(self.estoque("7890001"), 8)
        self.assertEqual(self.estoque("7890002"), 2)

    def test_venda_sem_estoque_nao_e_recusada_e_o_estoque_para_em_zero(self):
        compra, nova = self.vender([{"sku": "7890003", "quantidade": 1}, {"sku": "7890002", "quantidade": 5}])
        self.assertTrue(nova)
        self.assertEqual(compra.itens.count(), 2)
        self.assertEqual(self.estoque("7890003"), 0)
        self.assertEqual(self.estoque("7890002"), 0)

    def test_venda_reenviada_nao_tira_do_estoque_de_novo(self):
        id = uuid.uuid4()
        self.vender([{"sku": "7890001", "quantidade": 1}], id=id)
        self.vender([{"sku": "7890001", "quantidade": 1}], id=id)
        self.assertEqual(self.estoque("7890001"), 9)

    def test_venda_recusada_nao_mexe_no_estoque(self):
        with self.assertRaises(services.RegraViolada):
            self.vender([{"sku": "7890001", "quantidade": 1}], cpf="52998224725", pontos_resgate=100)
        self.assertEqual(self.estoque("7890001"), 10)

    def test_ajuste_grava_contagem_e_minimo(self):
        produto = services.ajustar_estoque("7890003", 12, 4)
        self.assertEqual((produto.estoque, produto.estoque_minimo), (12, 4))
        self.assertEqual(self.estoque("7890003"), 12)

    def test_ajuste_recusa_produto_inexistente_e_numeros_invalidos(self):
        with self.assertRaisesMessage(services.RegraViolada, "Produto não encontrado."):
            services.ajustar_estoque("999", 1, 1)
        with self.assertRaises(services.RegraViolada):
            services.ajustar_estoque("7890001", -2, 5)
        self.assertEqual(self.estoque("7890001"), 10)

    def test_lista_poe_esgotados_e_acabando_primeiro_e_conta_o_catalogo(self):
        dados = consultas.estoque_da_loja()
        self.assertEqual([p["sku"] for p in dados["produtos"]], ["7890003", "7890002", "7890001"])
        self.assertEqual(
            [p["situacao"] for p in dados["produtos"]], [regras.ESGOTADO, regras.ACABANDO, regras.EM_DIA]
        )
        self.assertEqual(dados["resumo"], {"produtos": 3, "unidades": 13, "esgotados": 1, "acabando": 1})

    def test_filtro_de_situacao_so_estreita_a_lista(self):
        dados = consultas.estoque_da_loja(situacao=regras.ACABANDO)
        self.assertEqual([p["sku"] for p in dados["produtos"]], ["7890002"])
        self.assertEqual(dados["resumo"]["produtos"], 3)

    def test_vendidos_conta_so_os_ultimos_30_dias(self):
        agora = timezone.now()
        self.vender([{"sku": "7890001", "quantidade": 2}], data=agora - timedelta(days=3))
        self.vender([{"sku": "7890001", "quantidade": 1}], data=agora - timedelta(days=45))
        linha = next(p for p in consultas.estoque_da_loja(agora=agora)["produtos"] if p["sku"] == "7890001")
        self.assertEqual(linha["vendidos"], 2)

    def test_api_lista_e_ajusta(self):
        dados = self.client.get("/api/estoque/", {"situacao": regras.ESGOTADO}).json()
        self.assertEqual([p["sku"] for p in dados["produtos"]], ["7890003"])

        resposta = self.client.post(
            "/api/estoque/7890003/", json.dumps({"quantidade": 4, "minimo": 5}), content_type="application/json"
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {"sku": "7890003", "estoque": 4, "minimo": 5, "situacao": regras.ACABANDO})

        erro = self.client.post(
            "/api/estoque/7890003/", json.dumps({"quantidade": "muitos", "minimo": 5}), content_type="application/json"
        )
        self.assertEqual(erro.status_code, 400)
        self.assertIn("quantidade", erro.json()["erro"])
