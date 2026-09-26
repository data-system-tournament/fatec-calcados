import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from src import services
from src.models import Caixa, Cliente, Loja, MovimentoPontos, Produto

ANA, BRUNO, CARLA = "52998224725", "39053344705", "11144477735"


class ConsultasTest(TestCase):
    """Telas de Clientes e Vendas: listas, filtros, perfil e detalhe (só leitura)."""

    def setUp(self):
        self.agora = timezone.now()
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa1 = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        self.caixa2 = Caixa.objects.create(codigo="centro-02", nome="Caixa 02", loja=loja)
        Produto.objects.create(sku="1", nome="Tênis Runner", preco=Decimal("500.00"))
        Produto.objects.create(sku="2", nome="Meia Esportiva", preco=Decimal("20.00"))

        for cpf, nome in [(ANA, "Ana Prata"), (BRUNO, "Bruno Bronze"), (CARLA, "Carla Sem Compra")]:
            services.cadastrar_cliente(cpf, nome, loja)

        # Ana acumula 1000 pontos (nível Prata); Bruno, 20 (Bronze).
        self.venda_ana, _ = services.registrar_venda(
            self.caixa1, [{"sku": "1", "quantidade": 2}], "PIX", cpf=ANA
        )
        self.venda_bruno, _ = services.registrar_venda(
            self.caixa2, [{"sku": "2", "quantidade": 1}], "DINHEIRO", cpf=BRUNO,
            data=self.agora - timedelta(days=10),
        )
        self.venda_sem_cpf, _ = services.registrar_venda(
            self.caixa1, [{"sku": "2", "quantidade": 3}], "CREDITO"
        )

    def clientes(self, **filtros):
        return self.client.get("/api/clientes/", filtros).json()

    def vendas(self, **filtros):
        return self.client.get("/api/vendas/", filtros).json()

    def test_lista_de_clientes_mascara_o_cpf_e_traz_saldo_e_compras(self):
        dados = self.clientes()
        self.assertEqual(dados["total"], 3)
        por_nome = {c["nome"]: c for c in dados["clientes"]}
        self.assertTrue(all(c["cpf"].startswith("***.") for c in dados["clientes"]))
        self.assertEqual(por_nome["Ana Prata"]["saldo_pontos"], 1000)
        self.assertEqual(por_nome["Ana Prata"]["nivel_nome"], "Prata")
        self.assertEqual(por_nome["Ana Prata"]["compras"], 1)
        self.assertEqual(por_nome["Carla Sem Compra"]["compras"], 0)
        self.assertIsNone(por_nome["Carla Sem Compra"]["ultima_compra"])

    def test_busca_por_nome_e_por_cpf(self):
        self.assertEqual([c["nome"] for c in self.clientes(busca="bruno")["clientes"]], ["Bruno Bronze"])
        self.assertEqual([c["nome"] for c in self.clientes(busca="529.982.247-25")["clientes"]], ["Ana Prata"])

    def test_filtro_por_nivel(self):
        self.assertEqual([c["nome"] for c in self.clientes(nivel="PRATA")["clientes"]], ["Ana Prata"])
        bronze = [c["nome"] for c in self.clientes(nivel="BRONZE")["clientes"]]
        self.assertEqual(bronze, ["Bruno Bronze", "Carla Sem Compra"])
        self.assertEqual(self.clientes(nivel="OURO")["total"], 0)

    def test_lista_ordena_por_saldo_do_maior_para_o_menor_ou_por_nome(self):
        # "Aline" tem 1 ponto e vem depois de quem tem mais, mesmo sendo a primeira no alfabeto.
        services.cadastrar_cliente("12345678909", "Aline Um Ponto")
        services.registrar_compra("12345678909", self.caixa1.loja, "1.00")
        por_saldo = [(c["nome"], c["saldo_pontos"]) for c in self.clientes()["clientes"]]
        self.assertEqual(
            por_saldo,
            [("Ana Prata", 1000), ("Bruno Bronze", 20), ("Aline Um Ponto", 1), ("Carla Sem Compra", 0)],
        )
        por_nome = [c["nome"] for c in self.clientes(ordem="nome")["clientes"]]
        self.assertEqual(por_nome, ["Aline Um Ponto", "Ana Prata", "Bruno Bronze", "Carla Sem Compra"])
        # Ordem desconhecida cai no padrão (saldo).
        self.assertEqual([c["nome"] for c in self.clientes(ordem="lixo")["clientes"]], [n for n, _ in por_saldo])

    def test_paginacao_devolve_a_ultima_pagina_quando_passa_do_fim(self):
        for i in range(22):
            Cliente.objects.create(cpf=f"9{i:010d}", nome=f"Extra {i:02d}")
        dados = self.clientes(pagina=2)
        self.assertEqual((dados["total"], dados["paginas"], dados["pagina"]), (25, 2, 2))
        self.assertEqual(len(dados["clientes"]), 5)
        self.assertEqual(self.clientes(pagina=99)["pagina"], 2)
        self.assertEqual(self.clientes(pagina="lixo")["pagina"], 1)

    def test_saldo_da_lista_ignora_lote_vencido_sem_gravar_expiracao(self):
        antiga = Cliente.objects.get(cpf=CARLA)
        services.registrar_compra(CARLA, self.caixa1.loja, "100.00", data=self.agora - timedelta(days=400))
        self.assertEqual(services.saldo(antiga), 100)  # o livro-razão ainda não registrou a expiração

        carla = next(c for c in self.clientes()["clientes"] if c["nome"] == "Carla Sem Compra")
        self.assertEqual(carla["saldo_pontos"], 0)
        self.assertFalse(MovimentoPontos.objects.filter(tipo=MovimentoPontos.Tipo.EXPIRACAO).exists())

    def test_perfil_do_cliente(self):
        ana = Cliente.objects.get(cpf=ANA)
        dados = self.client.get(f"/api/clientes/{ana.id}/perfil/").json()
        self.assertEqual(dados["nome"], "Ana Prata")
        self.assertTrue(dados["cpf"].startswith("***."))
        self.assertEqual(dados["nivel_nome"], "Prata")
        self.assertEqual(dados["pontos_12m"], 1000)
        self.assertEqual(dados["proximo_nivel"], {"nome": "Ouro", "faltam": 4000})
        self.assertEqual((dados["saldo_pontos"], dados["pontos_resgataveis"]), (1000, 1000))
        self.assertEqual(dados["valor_resgatavel"], 50.0)
        self.assertEqual(dados["total_compras"], 1)
        self.assertEqual(dados["total_gasto"], 1000.0)
        self.assertEqual([lote["pontos"] for lote in dados["lotes"]], [1000])
        self.assertEqual([c["id"] for c in dados["compras"]], [str(self.venda_ana.id)])
        self.assertEqual([m["tipo"] for m in dados["movimentos"]], ["ACUMULO"])

    def test_perfil_de_cliente_inexistente_da_404(self):
        self.assertEqual(self.client.get("/api/clientes/99999/perfil/").status_code, 404)

    def test_perfil_de_cliente_no_ultimo_nivel_nao_tem_proximo(self):
        services.registrar_compra(BRUNO, self.caixa1.loja, "5000.00")  # 20 + 5000 pontos em 12 meses
        bruno = Cliente.objects.get(cpf=BRUNO)
        dados = self.client.get(f"/api/clientes/{bruno.id}/perfil/").json()
        self.assertEqual(dados["nivel_nome"], "Ouro")
        self.assertIsNone(dados["proximo_nivel"])

    def test_lista_de_vendas_traz_totais_e_filtros(self):
        dados = self.vendas()
        self.assertEqual(dados["total"], 3)
        self.assertEqual(dados["faturamento"], 1000.0 + 20.0 + 60.0)
        self.assertEqual(len(dados["filtros"]["caixas"]), 2)
        self.assertEqual({f["codigo"] for f in dados["filtros"]["formas_pagamento"]}, {"PIX", "CREDITO", "DEBITO", "DINHEIRO"})
        venda_sem_cpf = next(v for v in dados["vendas"] if v["id"] == str(self.venda_sem_cpf.id))
        self.assertIsNone(venda_sem_cpf["cliente"])
        self.assertEqual(venda_sem_cpf["itens_qtd"], 3)

    def test_filtros_da_lista_de_vendas(self):
        self.assertEqual([v["id"] for v in self.vendas(pagamento="DINHEIRO")["vendas"]], [str(self.venda_bruno.id)])
        self.assertEqual(self.vendas(caixa="centro-01")["total"], 2)
        hoje = timezone.localdate().isoformat()
        self.assertEqual(self.vendas(inicio=hoje, fim=hoje)["total"], 2)  # a venda do Bruno foi há 10 dias
        self.assertEqual(self.vendas(inicio="lixo", pagamento="XPTO")["total"], 3)  # filtro inválido é ignorado

    def test_detalhe_da_venda_lista_os_itens(self):
        dados = self.client.get(f"/api/vendas/{self.venda_ana.id}/").json()
        self.assertEqual(dados["cliente"]["nome"], "Ana Prata")
        self.assertEqual(dados["itens"], [
            {"sku": "1", "nome": "Tênis Runner", "quantidade": 2, "preco_unitario": 500.0, "subtotal": 1000.0}
        ])
        self.assertEqual(dados["pontos_ganhos"], 1000)

    def test_detalhe_de_venda_inexistente_da_404(self):
        self.assertEqual(self.client.get(f"/api/vendas/{uuid.uuid4()}/").status_code, 404)
