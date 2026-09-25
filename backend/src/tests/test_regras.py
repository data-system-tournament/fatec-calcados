import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.test import TestCase
from django.utils import timezone

from src import cpf as cpf_utils
from src import regras, services
from src.models import Loja, MovimentoPontos

Tipo = MovimentoPontos.Tipo


def momento(ano, mes, dia, hora=12):
    return timezone.make_aware(datetime(ano, mes, dia, hora))


class RegrasPurasTest(TestCase):
    def test_bronze_um_ponto_por_real_sem_centavos(self):
        self.assertEqual(regras.calcular_pontos(Decimal("489.60"), regras.BRONZE), 489)

    def test_prata_bonus_de_10_porcento(self):
        self.assertEqual(regras.calcular_pontos(Decimal("489.60"), regras.PRATA), 537)

    def test_ouro_bonus_de_20_porcento(self):
        self.assertEqual(regras.calcular_pontos(Decimal("489.60"), regras.OURO), 586)

    def test_faixa_de_pontos_de_cada_nivel(self):
        self.assertEqual(regras.faixa_do_nivel(regras.BRONZE), (0, 1000))
        self.assertEqual(regras.faixa_do_nivel(regras.PRATA), (1000, 5000))
        self.assertEqual(regras.faixa_do_nivel(regras.OURO), (5000, None))
        with self.assertRaises(ValueError):
            regras.faixa_do_nivel("DIAMANTE")

    def test_compra_abaixo_de_um_real_nao_gera_pontos(self):
        self.assertEqual(regras.calcular_pontos(Decimal("0.99"), regras.OURO), 0)

    def test_limites_dos_niveis(self):
        self.assertEqual(regras.nivel_por_pontos(999), regras.BRONZE)
        self.assertEqual(regras.nivel_por_pontos(1000), regras.PRATA)
        self.assertEqual(regras.nivel_por_pontos(4999), regras.PRATA)
        self.assertEqual(regras.nivel_por_pontos(5000), regras.OURO)

    def test_100_pontos_valem_5_reais(self):
        self.assertEqual(regras.desconto_do_resgate(100), Decimal("5.00"))
        self.assertEqual(regras.desconto_do_resgate(1200), Decimal("60.00"))

    def test_quanto_falta_para_o_proximo_nivel(self):
        self.assertEqual(regras.proximo_nivel(240), ("Prata", 760))
        self.assertEqual(regras.proximo_nivel(1000), ("Ouro", 4000))
        self.assertIsNone(regras.proximo_nivel(7000))


class CpfTest(TestCase):
    def test_cpf_valido_e_invalido(self):
        self.assertTrue(cpf_utils.validar("529.982.247-25"))
        self.assertFalse(cpf_utils.validar("529.982.247-26"))
        self.assertFalse(cpf_utils.validar("111.111.111-11"))
        self.assertFalse(cpf_utils.validar("123"))

    def test_cpfs_gerados_pelo_seed_sao_validos(self):
        rng = random.Random(1)
        for _ in range(200):
            self.assertTrue(cpf_utils.validar(cpf_utils.gerar(rng)))


class CompraTest(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.cliente = services.cadastrar_cliente(
            "529.982.247-25", "Mariana Souza", self.loja, data=momento(2025, 1, 1)
        )

    def comprar(self, valor, quando, resgate=0):
        return services.registrar_compra(self.cliente.cpf, self.loja, valor, resgate, data=quando)

    def assert_ledger_consistente(self):
        saldo = services.saldo(self.cliente)
        lotes = self.cliente.movimentos.filter(tipo=Tipo.ACUMULO).aggregate(t=Sum("restante"))["t"] or 0
        self.assertEqual(saldo, lotes)

    def test_compra_simples_gera_pontos_e_lote_com_validade(self):
        compra = self.comprar("489.60", momento(2025, 3, 10))
        self.assertEqual(compra.pontos_ganhos, 489)
        self.assertEqual(compra.nivel_na_compra, regras.BRONZE)
        lote = self.cliente.movimentos.get(tipo=Tipo.ACUMULO)
        self.assertEqual(lote.expira_em, momento(2025, 3, 10) + timedelta(days=365))
        self.assertEqual(services.saldo(self.cliente), 489)

    def test_bonus_usa_o_nivel_de_antes_da_compra(self):
        self.comprar("900.00", momento(2025, 3, 1))
        compra = self.comprar("200.00", momento(2025, 3, 2))
        self.assertEqual(compra.nivel_na_compra, regras.BRONZE)
        self.assertEqual(compra.pontos_ganhos, 200)
        self.assertEqual(services.nivel_atual(self.cliente, momento(2025, 3, 3)), regras.PRATA)
        seguinte = self.comprar("100.00", momento(2025, 3, 4))
        self.assertEqual(seguinte.pontos_ganhos, 110)

    def test_resgate_da_desconto_e_pontos_sao_sobre_o_valor_pago(self):
        self.comprar("500.00", momento(2025, 3, 1))
        compra = self.comprar("200.00", momento(2025, 3, 5), resgate=300)
        self.assertEqual(compra.desconto, Decimal("15.00"))
        self.assertEqual(compra.valor_pago, Decimal("185.00"))
        self.assertEqual(compra.pontos_ganhos, 185)
        self.assertEqual(services.saldo(self.cliente), 500 - 300 + 185)
        self.assert_ledger_consistente()

    def test_resgate_precisa_ser_multiplo_de_100(self):
        self.comprar("500.00", momento(2025, 3, 1))
        with self.assertRaises(services.RegraViolada):
            self.comprar("100.00", momento(2025, 3, 2), resgate=150)

    def test_nao_resgata_mais_do_que_o_saldo(self):
        self.comprar("250.00", momento(2025, 3, 1))
        with self.assertRaises(services.RegraViolada):
            self.comprar("100.00", momento(2025, 3, 2), resgate=300)

    def test_desconto_nao_pode_passar_do_valor_da_compra(self):
        self.comprar("1000.00", momento(2025, 3, 1))
        with self.assertRaises(services.RegraViolada):
            self.comprar("10.00", momento(2025, 3, 2), resgate=300)

    def test_erro_nao_grava_nada(self):
        self.comprar("250.00", momento(2025, 3, 1))
        antes = MovimentoPontos.objects.count()
        with self.assertRaises(services.RegraViolada):
            self.comprar("100.00", momento(2025, 3, 2), resgate=300)
        self.assertEqual(MovimentoPontos.objects.count(), antes)
        self.assertEqual(self.cliente.compras.count(), 1)

    def test_cpf_nao_cadastrado(self):
        with self.assertRaises(services.RegraViolada):
            services.registrar_compra("390.533.447-05", self.loja, "100.00")

    def test_resgate_consome_os_pontos_mais_antigos_primeiro(self):
        self.comprar("300.00", momento(2025, 1, 10))
        self.comprar("400.00", momento(2025, 6, 10))
        self.comprar("100.00", momento(2025, 7, 1), resgate=200)
        antigo, novo, _ = self.cliente.movimentos.filter(tipo=Tipo.ACUMULO).order_by("data")
        self.assertEqual(antigo.restante, 100)
        self.assertEqual(novo.restante, 400)
        self.assert_ledger_consistente()

    def test_pontos_expiram_em_12_meses_so_o_que_sobrou_do_lote(self):
        self.comprar("300.00", momento(2025, 1, 10))
        self.comprar("100.00", momento(2025, 2, 1), resgate=200)
        expirados = services.expirar_pontos(self.cliente, momento(2026, 1, 11))
        self.assertEqual(expirados, 100)
        exp = self.cliente.movimentos.get(tipo=Tipo.EXPIRACAO)
        self.assertEqual(exp.pontos, -100)
        self.assertEqual(exp.data, momento(2025, 1, 10) + timedelta(days=365))
        self.assert_ledger_consistente()

    def test_expirar_duas_vezes_nao_duplica(self):
        self.comprar("300.00", momento(2025, 1, 10))
        services.expirar_pontos(self.cliente, momento(2026, 2, 1))
        self.assertEqual(services.expirar_pontos(self.cliente, momento(2026, 3, 1)), 0)
        self.assertEqual(self.cliente.movimentos.filter(tipo=Tipo.EXPIRACAO).count(), 1)

    def test_resgatar_nao_rebaixa_o_nivel(self):
        self.comprar("1200.00", momento(2025, 3, 1))
        self.comprar("100.00", momento(2025, 3, 2), resgate=1000)
        self.assertEqual(services.nivel_atual(self.cliente, momento(2025, 3, 3)), regras.PRATA)

    def test_nivel_cai_quando_os_pontos_saem_da_janela_de_12_meses(self):
        self.comprar("1200.00", momento(2025, 3, 1))
        self.assertEqual(services.nivel_atual(self.cliente, momento(2026, 2, 1)), regras.PRATA)
        self.assertEqual(services.nivel_atual(self.cliente, momento(2026, 3, 5)), regras.BRONZE)
