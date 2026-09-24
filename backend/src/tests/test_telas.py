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
