import json
import uuid
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from src import services
from src.models import Caixa, Compra, Loja, Produto
from src.tests.apoio import entrar_como_equipe


class PdvTest(TestCase):
    def setUp(self):
        entrar_como_equipe(self.client)
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"))
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"))
        Produto.objects.create(sku="7890003", nome="Bota Antiga", preco=Decimal("99.90"), ativo=False)
        services.cadastrar_cliente("52998224725", "Mariana Souza", loja)

    def post(self, url, dados):
        return self.client.post(url, json.dumps(dados), content_type="application/json")

    def vender(self, **campos):
        venda = {
            "caixa": "centro-01",
            "itens": [{"sku": "7890001", "quantidade": 1}],
            "forma_pagamento": "PIX",
        }
        venda.update(campos)
        return self.post("/api/vendas/", venda)


    def test_catalogo_mostra_so_produtos_ativos(self):
        produtos = self.client.get("/api/produtos/").json()["produtos"]
        self.assertEqual([p["sku"] for p in produtos], ["7890002", "7890001"])
        self.assertEqual(produtos[1]["preco"], 289.90)

    def test_catalogo_manda_a_foto_ou_vazio(self):
        Produto.objects.filter(sku="7890001").update(foto="https://images.unsplash.com/photo-1?w=600")
        produtos = {p["sku"]: p for p in self.client.get("/api/produtos/").json()["produtos"]}
        self.assertEqual(produtos["7890001"]["foto"], "https://images.unsplash.com/photo-1?w=600")
        self.assertEqual(produtos["7890002"]["foto"], "")

    def test_busca_por_nome_ou_codigo(self):
        por_nome = self.client.get("/api/produtos/", {"busca": "tênis"}).json()["produtos"]
        por_codigo = self.client.get("/api/produtos/", {"busca": "7890002"}).json()["produtos"]
        self.assertEqual([p["nome"] for p in por_nome], ["Tênis Runner"])
        self.assertEqual([p["nome"] for p in por_codigo], ["Meia Esportiva"])


    def test_consulta_cliente(self):
        cliente = self.client.get("/api/clientes/529.982.247-25/").json()
        self.assertEqual(cliente["nome"], "Mariana Souza")
        self.assertEqual(cliente["nivel_nome"], "Bronze")
        self.assertEqual(cliente["saldo_pontos"], 0)
        self.assertEqual(self.client.get("/api/clientes/39053344705/").status_code, 404)

    def test_cadastra_cliente_pelo_caixa(self):
        r = self.post("/api/clientes/", {"cpf": "390.533.447-05", "nome": "João Lima", "caixa": "centro-01"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["cpf"], "39053344705")
        self.assertEqual(r.json()["saldo_pontos"], 0)

    def test_cadastro_recusa_cpf_invalido_ou_repetido(self):
        self.assertEqual(self.post("/api/clientes/", {"cpf": "123", "nome": "X"}).status_code, 400)
        repetido = self.post("/api/clientes/", {"cpf": "52998224725", "nome": "Outra"})
        self.assertEqual(repetido.status_code, 400)
        self.assertIn("já está cadastrado", repetido.json()["erro"])


    def test_venda_com_cpf_gera_pontos_e_grava_os_itens(self):
        r = self.vender(cpf="52998224725", itens=[
            {"sku": "7890001", "quantidade": 1},
            {"sku": "7890002", "quantidade": 2},
        ])
        self.assertEqual(r.status_code, 201)
        venda = r.json()
        self.assertEqual(venda["valor_pago"], 329.70)
        self.assertEqual(venda["pontos_ganhos"], 329)
        self.assertEqual(venda["saldo_atual"], 329)

        compra = Compra.objects.get(id=venda["id"])
        self.assertEqual(compra.forma_pagamento, "PIX")
        self.assertEqual(compra.caixa, self.caixa)
        self.assertEqual(compra.itens.count(), 2)

    def test_preco_vem_do_banco_e_nao_da_tela(self):
        r = self.vender(itens=[{"sku": "7890001", "quantidade": 1, "preco": 1}])
        self.assertEqual(r.json()["valor_pago"], 289.90)

    def test_venda_sem_cpf_nao_gera_pontos(self):
        venda = self.vender().json()
        self.assertEqual(venda["pontos_ganhos"], 0)
        self.assertIsNone(venda["saldo_atual"])
        self.assertIsNone(Compra.objects.get(id=venda["id"]).cliente)

    def test_resgate_exige_cpf(self):
        r = self.vender(pontos_resgate=100)
        self.assertEqual(r.status_code, 400)
        self.assertIn("informe o CPF", r.json()["erro"])

    def test_resgate_no_caixa_da_desconto(self):
        self.vender(cpf="52998224725", itens=[{"sku": "7890001", "quantidade": 2}])
        venda = self.vender(cpf="52998224725", pontos_resgate=300).json()
        self.assertEqual(venda["desconto"], 15.0)
        self.assertEqual(venda["valor_pago"], 274.90)
        self.assertEqual(venda["saldo_atual"], 579 - 300 + 274)

    def test_venda_reenviada_nao_duplica(self):
        id_venda = str(uuid.uuid4())
        primeira = self.vender(id=id_venda, cpf="52998224725")
        segunda = self.vender(id=id_venda, cpf="52998224725")
        self.assertEqual(primeira.status_code, 201)
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(Compra.objects.count(), 1)
        self.assertEqual(segunda.json()["saldo_atual"], 289)

    def test_venda_offline_usa_a_data_do_caixa(self):
        venda = self.vender(data="2026-09-20T10:15:00").json()
        data = timezone.localtime(Compra.objects.get(id=venda["id"]).data)
        self.assertEqual((data.day, data.hour, data.minute), (20, 10, 15))

    def test_venda_com_data_no_futuro_e_recusada(self):
        r = self.vender(data="2099-01-01T10:00:00")
        self.assertEqual(r.status_code, 400)
        self.assertIn("futuro", r.json()["erro"])

    def test_erros_da_venda_nao_gravam_nada(self):
        casos = [
            self.vender(itens=[]),
            self.vender(itens=[{"sku": "0000", "quantidade": 1}]),
            self.vender(itens=[{"sku": "7890003", "quantidade": 1}]),
            self.vender(itens=[{"sku": "7890001", "quantidade": 0}]),
            self.vender(forma_pagamento="CHEQUE"),
            self.vender(caixa="nao-existe"),
            self.vender(cpf="52998224725", pontos_resgate="abc"),
            self.vender(id="nao-e-uuid"),
        ]
        for r in casos:
            self.assertEqual(r.status_code, 400, r.json())
        self.assertEqual(Compra.objects.count(), 0)

    def test_corpo_invalido_devolve_400(self):
        lixo = self.client.post("/api/vendas/", "isto não é json", content_type="application/json")
        lista = self.post("/api/vendas/", [1, 2, 3])
        self.assertEqual(lixo.status_code, 400)
        self.assertEqual(lista.status_code, 400)
