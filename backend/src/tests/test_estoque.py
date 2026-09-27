import json
import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from src import consultas, regras, services
from src.models import Caixa, EstoqueNumeracao, Loja, Produto
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
        self.assertEqual(
            dados["resumo"],
            {"produtos": 3, "unidades": 13, "esgotados": 1, "acabando": 1, "numeracoes_esgotadas": 0},
        )

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
        self.assertEqual(resposta.json(), {
            "sku": "7890003", "nome": "Bota Couro", "usa_numeracao": False, "minimo": 5, "vendidos": 0,
            "estoque": 4, "situacao": regras.ACABANDO, "numeracoes": [],
        })

        erro = self.client.post(
            "/api/estoque/7890003/", json.dumps({"quantidade": "muitos", "minimo": 5}), content_type="application/json"
        )
        self.assertEqual(erro.status_code, 400)
        self.assertIn("quantidade", erro.json()["erro"])


# Feito com IA: estoque por numeração (calçado) e a regra da loja online de só vender o que tem.
class EstoquePorNumeracaoTest(TestCase):
    def setUp(self):
        entrar_como_equipe(self.client)
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        self.tenis = Produto.objects.create(
            sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"), usa_numeracao=True, estoque_minimo=2
        )
        EstoqueNumeracao.objects.bulk_create([
            EstoqueNumeracao(produto=self.tenis, numeracao=39, quantidade=5),
            EstoqueNumeracao(produto=self.tenis, numeracao=40, quantidade=1),
            EstoqueNumeracao(produto=self.tenis, numeracao=41, quantidade=0),
        ])
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"), estoque=3)
        self.mariana = services.cadastrar_cliente("52998224725", "Mariana Souza", loja)

    def numero(self, numeracao):
        return EstoqueNumeracao.objects.get(produto=self.tenis, numeracao=numeracao).quantidade

    def vender(self, itens, **campos):
        return services.registrar_venda(self.caixa, itens, "PIX", **campos)

    def test_venda_desconta_da_numeracao_vendida(self):
        compra, _ = self.vender([{"sku": "7890001", "quantidade": 2, "numeracao": 39}])
        self.assertEqual(self.numero(39), 3)
        self.assertEqual(self.numero(40), 1)
        self.assertEqual(compra.itens.get().numeracao, 39)

    def test_calcado_exige_numeracao_da_grade_e_acessorio_nao_tem(self):
        with self.assertRaisesMessage(services.RegraViolada, "Escolha a numeração"):
            self.vender([{"sku": "7890001", "quantidade": 1}])
        with self.assertRaisesMessage(services.RegraViolada, "não trabalhamos com a numeração 45"):
            self.vender([{"sku": "7890001", "quantidade": 1, "numeracao": 45}])
        with self.assertRaisesMessage(services.RegraViolada, "não tem numeração"):
            self.vender([{"sku": "7890002", "quantidade": 1, "numeracao": 40}])

    def test_caixa_vende_numeracao_zerada_e_para_em_zero(self):
        _compra, nova = self.vender([{"sku": "7890001", "quantidade": 1, "numeracao": 41}])
        self.assertTrue(nova)
        self.assertEqual(self.numero(41), 0)

    def test_loja_online_recusa_numeracao_sem_estoque_e_nao_mexe_em_nada(self):
        with self.assertRaisesMessage(services.RegraViolada, "Tênis Runner nº 41 esgotou"):
            services.comprar_online(self.mariana, [{"sku": "7890001", "quantidade": 1, "numeracao": 41}], "PIX")
        # O mesmo número em duas linhas soma: pedir 2 do 40 quando só há 1 é recusado.
        with self.assertRaisesMessage(services.RegraViolada, "Só temos 1 de Tênis Runner nº 40"):
            services.comprar_online(self.mariana, [
                {"sku": "7890001", "quantidade": 1, "numeracao": 40},
                {"sku": "7890001", "quantidade": 1, "numeracao": 40},
            ], "PIX")
        with self.assertRaisesMessage(services.RegraViolada, "Só temos 3 de Meia Esportiva"):
            services.comprar_online(self.mariana, [{"sku": "7890002", "quantidade": 4}], "PIX")
        self.assertEqual((self.numero(40), self.numero(41)), (1, 0))
        self.assertFalse(self.mariana.compras.exists())

    def test_loja_online_vende_o_ultimo_par_e_reenvio_nao_desconta_de_novo(self):
        id = uuid.uuid4()
        itens = [{"sku": "7890001", "quantidade": 1, "numeracao": 40}]
        _compra, nova = services.comprar_online(self.mariana, itens, "PIX", id=id)
        self.assertTrue(nova)
        # O reenvio chega com o estoque já zerado e mesmo assim devolve a compra, sem recusar nem descontar.
        _compra, nova = services.comprar_online(self.mariana, itens, "PIX", id=id)
        self.assertFalse(nova)
        self.assertEqual(self.numero(40), 0)

    def test_ajuste_grava_uma_numeracao_e_pode_abrir_numero_novo(self):
        services.ajustar_estoque("7890001", 7, 3, numeracao=41)
        services.ajustar_estoque("7890001", 4, 3, numeracao=42)
        self.assertEqual((self.numero(41), self.numero(42)), (7, 4))
        self.tenis.refresh_from_db()
        self.assertEqual(self.tenis.estoque_minimo, 3)
        with self.assertRaisesMessage(services.RegraViolada, "Escolha a numeração"):
            services.ajustar_estoque("7890001", 7, 3)
        with self.assertRaisesMessage(services.RegraViolada, "não tem numeração"):
            services.ajustar_estoque("7890002", 7, 3, numeracao=40)

    def test_lista_soma_a_grade_e_marca_cada_numeracao(self):
        linha = next(p for p in consultas.estoque_da_loja()["produtos"] if p["sku"] == "7890001")
        self.assertEqual(linha["estoque"], 6)
        self.assertEqual(linha["situacao"], regras.ACABANDO)
        self.assertEqual(linha["numeracoes"], [
            {"numeracao": 39, "quantidade": 5, "situacao": regras.EM_DIA},
            {"numeracao": 40, "quantidade": 1, "situacao": regras.ACABANDO},
            {"numeracao": 41, "quantidade": 0, "situacao": regras.ESGOTADO},
        ])
        self.assertEqual(consultas.estoque_da_loja()["resumo"]["numeracoes_esgotadas"], 1)

    def test_api_ajusta_uma_numeracao(self):
        resposta = self.client.post(
            "/api/estoque/7890001/", json.dumps({"quantidade": 6, "minimo": 2, "numeracao": 41}),
            content_type="application/json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["estoque"], 12)
        self.assertEqual(resposta.json()["situacao"], regras.ACABANDO)

    def test_catalogo_traz_estoque_grade_e_nota_das_avaliacoes(self):
        self.vender([{"sku": "7890001", "quantidade": 1, "numeracao": 39}], cpf=self.mariana.cpf)
        services.avaliar_produto(self.mariana, "7890001", 4, "Confortável e leve, recomendo.")
        produtos = {p["sku"]: p for p in self.client.get("/api/produtos/").json()["produtos"]}
        tenis, meia = produtos["7890001"], produtos["7890002"]
        self.assertEqual((tenis["usa_numeracao"], tenis["estoque"]), (True, 5))
        self.assertEqual([n["numeracao"] for n in tenis["numeracoes"]], [39, 40, 41])
        self.assertEqual((tenis["nota_media"], tenis["avaliacoes"]), (4.0, 1))
        self.assertEqual((meia["estoque"], meia["numeracoes"], meia["nota_media"], meia["avaliacoes"]), (3, [], None, 0))

    def test_pagina_do_produto_mostra_so_o_primeiro_nome_de_quem_avaliou(self):
        Produto.objects.filter(pk=self.tenis.pk).update(descricao="Tênis leve de treino.")
        self.vender([{"sku": "7890001", "quantidade": 1, "numeracao": 39}], cpf=self.mariana.cpf)
        services.avaliar_produto(self.mariana, "7890001", 5, "Ótimo para caminhar todo dia.")
        dados = self.client.get("/api/produtos/7890001/").json()
        self.assertEqual(dados["descricao"], "Tênis leve de treino.")
        self.assertEqual(dados["comentarios"][0]["nome"], "Mariana")
        self.assertEqual(dados["por_nota"][0], {"nota": 5, "quantidade": 1})
        self.assertEqual(self.client.get("/api/produtos/999/").status_code, 404)
