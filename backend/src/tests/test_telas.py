from datetime import datetime

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from src import indicadores, regras
from src.models import Cliente, Compra, MovimentoPontos


class SeedEDashboardTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("popular_dados", clientes=25, compras=220, semente=7, verbosity=0)

    def test_seed_respeita_o_minimo_do_desafio(self):
        self.assertGreaterEqual(Cliente.objects.count(), 20)
        self.assertGreaterEqual(Compra.objects.count(), 200)

    def test_custo_bate_com_pontos_resgatados(self):
        inicio, fim = indicadores.periodo_padrao()
        dados = indicadores.pontos_e_custo(inicio, fim)
        self.assertEqual(dados["custo"], regras.desconto_do_resgate(dados["resgatados"]))

    def test_compras_do_dashboard_sao_so_as_com_cpf(self):
        inicio, fim = indicadores.periodo_padrao()
        com_cpf = Compra.objects.filter(data__gte=inicio, data__lte=fim, cliente__isnull=False).count()
        sem_cpf = Compra.objects.filter(data__gte=inicio, data__lte=fim, cliente__isnull=True).count()
        self.assertGreater(sem_cpf, 0)
        self.assertEqual(indicadores.pontos_e_custo(inicio, fim)["compras"], com_cpf)

    def test_distribuicao_por_nivel_soma_o_total(self):
        base = indicadores.base_do_programa(timezone.now())
        self.assertEqual(sum(n["clientes"] for n in base["niveis"]), base["total"])

    def test_saldo_em_aberto_bate_com_os_lotes(self):
        lotes = sum(MovimentoPontos.objects.filter(tipo="ACUMULO").values_list("restante", flat=True))
        _, fim = indicadores.periodo_padrao()
        self.assertEqual(indicadores.pontos_e_custo(fim, fim)["em_aberto"], lotes)

    def test_evolucao_mensal_soma_o_mesmo_que_o_resumo(self):
        inicio, fim = indicadores.periodo_padrao()
        serie = indicadores.evolucao_mensal(inicio, fim)
        resumo = indicadores.pontos_e_custo(inicio, fim)
        self.assertEqual(sum(serie["acumulados"]), resumo["acumulados"])
        self.assertEqual(sum(serie["resgatados"]), resumo["resgatados"])

    def test_recortes_de_vendas_somam_o_faturamento_do_periodo(self):
        vendas = self.client.get("/api/dashboard/").json()["vendas"]
        self.assertGreater(vendas["quantidade"], 0)
        self.assertGreater(len(vendas["por_caixa"]), 1)  # o seed tem várias lojas, cada uma com o seu "Caixa 01"
        self.assertAlmostEqual(sum(c["faturamento"] for c in vendas["por_caixa"]), vendas["faturamento"], places=2)
        self.assertAlmostEqual(sum(p["faturamento"] for p in vendas["por_pagamento"]), vendas["faturamento"], places=2)
        self.assertEqual(sum(p["quantidade"] for p in vendas["por_pagamento"]), vendas["quantidade"])
        self.assertAlmostEqual(vendas["ticket_medio"], vendas["faturamento"] / vendas["quantidade"], places=2)
        self.assertLessEqual(vendas["com_cpf"], vendas["quantidade"])

    def test_produtos_mais_vendidos_vem_em_ordem(self):
        mais_vendidos = self.client.get("/api/dashboard/").json()["vendas"]["mais_vendidos"]
        self.assertTrue(0 < len(mais_vendidos) <= 5)
        unidades = [p["unidades"] for p in mais_vendidos]
        self.assertEqual(unidades, sorted(unidades, reverse=True))

    def test_resgate_por_nivel_bate_com_o_resumo_de_pontos(self):
        dados = self.client.get("/api/dashboard/").json()
        niveis = dados["resgate_por_nivel"]
        self.assertEqual([n["codigo"] for n in niveis], [codigo for codigo, *_ in regras.NIVEIS])
        self.assertEqual(sum(n["compras"] for n in niveis), dados["pontos"]["compras"])
        self.assertEqual(sum(n["compras_com_resgate"] for n in niveis), dados["pontos"]["compras_com_resgate"])
        self.assertEqual(sum(n["pontos_resgatados"] for n in niveis), dados["pontos"]["resgatados"])

    def test_pontos_a_vencer_ficam_dentro_do_saldo_em_aberto(self):
        pontos = self.client.get("/api/dashboard/").json()["pontos"]
        a_vencer = pontos["a_vencer"]
        self.assertEqual(a_vencer["dias"], 30)
        self.assertLessEqual(a_vencer["pontos"], pontos["em_aberto"])
        self.assertEqual(a_vencer["reais"], float(regras.desconto_do_resgate(a_vencer["pontos"])))

    def test_ranking_traz_o_id_do_cliente_para_o_detalhe(self):
        for linha in self.client.get("/api/dashboard/").json()["ranking"]:
            self.assertEqual(self.client.get(f"/api/clientes/{linha['id']}/perfil/").status_code, 200)

    def test_api_do_dashboard_aceita_periodo_invalido(self):
        self.assertEqual(self.client.get("/api/dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/api/dashboard/?inicio=lixo&fim=2026-06-30").status_code, 200)

    def test_api_do_dashboard_bate_com_os_indicadores(self):
        dados = self.client.get("/api/dashboard/", {"inicio": "2026-01-01", "fim": "2026-06-30"}).json()
        self.assertEqual(dados["inicio"], "2026-01-01")
        inicio, fim = indicadores.periodo_de_datas(datetime(2026, 1, 1).date(), datetime(2026, 6, 30).date())
        self.assertEqual(dados["pontos"]["acumulados"], indicadores.pontos_e_custo(inicio, fim)["acumulados"])
        self.assertEqual(sum(dados["evolucao"]["acumulados"]), dados["pontos"]["acumulados"])
        for linha in dados["ranking"]:
            self.assertTrue(linha["cpf"].startswith("***."))
