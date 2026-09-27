import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from src import acoes, consultas, indicadores, regras, services
from src.models import Caixa, Cliente, Compra, Loja, MovimentoPontos, Produto

SENHA = "sapato-azul-2026"
Tipo = MovimentoPontos.Tipo


class ExclusaoDeContaTest(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=self.loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"))
        self.cliente = services.criar_acesso("52998224725", "Mariana Souza", SENHA)
        services.atualizar_perfil(self.cliente, 37, timezone.localdate() - timedelta(days=9000), True)
        services.registrar_venda(self.caixa, [{"sku": "7890001", "quantidade": 1}], "PIX", self.cliente.cpf)
        services.avaliar_produto(self.cliente, "7890001", 5, "Muito confortável, uso todo dia.")

    def post(self, url, dados):
        return self.client.post(url, json.dumps(dados), content_type="application/json")

    def test_apaga_os_dados_pessoais_e_o_login(self):
        usuario_id = self.cliente.usuario_id
        services.excluir_conta(self.cliente, SENHA)
        cliente = Cliente.objects.get(pk=self.cliente.pk)
        self.assertEqual(cliente.nome, regras.NOME_DE_CONTA_EXCLUIDA)
        self.assertEqual(cliente.cpf, regras.cpf_de_conta_excluida(cliente.pk))
        self.assertIsNone(cliente.numeracao)
        self.assertIsNone(cliente.nascimento)
        self.assertIsNone(cliente.contato_autorizado_em)
        self.assertIsNone(cliente.usuario)
        self.assertIsNotNone(cliente.excluido_em)
        self.assertFalse(User.objects.filter(pk=usuario_id).exists())

    def test_cancela_os_pontos_e_guarda_as_vendas(self):
        self.assertGreater(services.saldo(self.cliente), 0)
        services.excluir_conta(self.cliente, SENHA)
        self.assertEqual(services.saldo(self.cliente), 0)
        self.assertFalse(self.cliente.movimentos.filter(tipo=Tipo.ACUMULO, restante__gt=0).exists())
        self.assertEqual(Compra.objects.filter(cliente=self.cliente).count(), 1)
        self.assertEqual(self.cliente.avaliacoes.count(), 1)

    def test_senha_errada_nao_exclui(self):
        with self.assertRaisesMessage(services.RegraViolada, "A senha não confere."):
            services.excluir_conta(self.cliente, "errada")
        cliente = Cliente.objects.get(pk=self.cliente.pk)
        self.assertEqual(cliente.nome, "Mariana Souza")
        self.assertIsNone(cliente.excluido_em)

    def test_some_das_listas_da_loja(self):
        services.excluir_conta(self.cliente, SENHA)
        agora = timezone.now()
        self.assertEqual(consultas.listar_clientes()["clientes"], [])
        self.assertEqual(indicadores.pontos_12m_por_cliente(agora).count(), 0)
        daqui_a_um_ano = agora + timedelta(days=100)
        self.assertEqual(acoes.clientes_sumindo(daqui_a_um_ano), [])
        self.assertEqual(acoes.novos_sem_segunda_compra(daqui_a_um_ano), [])

    def test_o_mesmo_cpf_pode_se_cadastrar_de_novo_do_zero(self):
        services.excluir_conta(self.cliente, SENHA)
        novo = services.criar_acesso("52998224725", "Mariana Souza", SENHA)
        self.assertNotEqual(novo.pk, self.cliente.pk)
        self.assertEqual(services.saldo(novo), 0)

    def test_api_exclui_e_encerra_a_sessao(self):
        self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": SENHA})
        self.assertEqual(self.post("/api/conta/excluir/", {"senha": "errada"}).status_code, 400)
        self.assertEqual(self.post("/api/conta/excluir/", {"senha": SENHA}).status_code, 200)
        self.assertEqual(self.client.get("/api/conta/").status_code, 401)
        r = self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": SENHA})
        self.assertEqual(r.json()["erro"], "CPF ou senha incorretos.")
