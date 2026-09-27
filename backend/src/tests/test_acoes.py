from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from src import acoes, services
from src.models import Loja
from src.tests.apoio import entrar_como_equipe

CPFS = ["52998224725", "39053344705", "11144477735", "86288366757", "71428793860"]


class AcoesTest(TestCase):
    def setUp(self):
        entrar_como_equipe(self.client)
        self.agora = timezone.now()
        self.loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")

    def cliente(self, cpf, nome, dias_atras):
        return services.cadastrar_cliente(cpf, nome, self.loja, data=self.agora - timedelta(days=dias_atras))

    def comprar(self, cliente, valor, dias_atras):
        services.registrar_compra(cliente.cpf, self.loja, valor, data=self.agora - timedelta(days=dias_atras))

    def nomes(self, lista):
        return [c["nome"] for c in lista]

    def test_sumindo_e_quem_nao_compra_ha_mais_de_60_dias(self):
        sumida = self.cliente(CPFS[0], "Ana Sumida", 200)
        self.comprar(sumida, "100.00", 90)
        ativa = self.cliente(CPFS[1], "Bia Ativa", 200)
        self.comprar(ativa, "100.00", 10)
        self.cliente(CPFS[2], "Caio Sem Compra", 200)

        lista = acoes.clientes_sumindo(self.agora)
        self.assertEqual(self.nomes(lista), ["Ana Sumida"])
        self.assertEqual(lista[0]["detalhe"], "sem comprar há 90 dias")

    def test_pontos_vencendo_nos_proximos_30_dias(self):
        vence_logo = self.cliente(CPFS[0], "Ana", 400)
        self.comprar(vence_logo, "250.00", 350)
        vence_depois = self.cliente(CPFS[1], "Bia", 400)
        self.comprar(vence_depois, "250.00", 200)

        lista = acoes.pontos_vencendo(self.agora)
        self.assertEqual(self.nomes(lista), ["Ana"])
        self.assertIn("250 pts vencem em", lista[0]["detalhe"])

    def test_perto_de_subir_de_nivel(self):
        quase_prata = self.cliente(CPFS[0], "Ana", 100)
        self.comprar(quase_prata, "850.00", 30)
        longe = self.cliente(CPFS[1], "Bia", 100)
        self.comprar(longe, "300.00", 30)

        lista = acoes.perto_de_subir(self.agora)
        self.assertEqual(self.nomes(lista), ["Ana"])
        self.assertEqual(lista[0]["detalhe"], "faltam 150 pts para Prata")

    def test_novos_sem_segunda_compra(self):
        uma_compra = self.cliente(CPFS[0], "Ana Uma Compra", 40)
        self.comprar(uma_compra, "100.00", 39)
        duas_compras = self.cliente(CPFS[1], "Bia Duas Compras", 40)
        self.comprar(duas_compras, "100.00", 39)
        self.comprar(duas_compras, "100.00", 20)
        recente = self.cliente(CPFS[2], "Caio Recente", 10)
        self.comprar(recente, "100.00", 9)

        self.assertEqual(self.nomes(acoes.novos_sem_segunda_compra(self.agora)), ["Ana Uma Compra"])

    def test_api_devolve_as_quatro_acoes_com_cpf_mascarado(self):
        cliente = self.cliente(CPFS[0], "Ana", 200)
        self.comprar(cliente, "100.00", 90)

        dados = self.client.get("/api/acoes/").json()["acoes"]
        self.assertEqual([a["tipo"] for a in dados], ["sumindo", "vencendo", "subir", "segunda_compra"])
        self.assertTrue(dados[0]["clientes"][0]["cpf"].startswith("***."))
