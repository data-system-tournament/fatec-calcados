import json
import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import Client, TestCase
from django.utils import timezone

from src import regras, services
from src.models import Caixa, Compra, Loja, MovimentoPontos, Produto

SENHA = "sapato-azul-2026"


class ContaTest(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        self.caixa = Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=self.loja)
        # A loja online só vende o que tem em estoque (a numeração tem teste próprio em test_estoque).
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco=Decimal("289.90"), estoque=50)
        Produto.objects.create(sku="7890002", nome="Meia Esportiva", preco=Decimal("19.90"), estoque=50)
        self.mariana = services.cadastrar_cliente("52998224725", "Mariana Souza", self.loja)

    def post(self, url, dados, client=None):
        return (client or self.client).post(url, json.dumps(dados), content_type="application/json")

    def criar_acesso(self, cpf="52998224725", nome="Mariana", senha=SENHA):
        return self.post("/api/conta/cadastro/", {"cpf": cpf, "nome": nome, "senha": senha})

    def comprar(self, **campos):
        compra = {"itens": [{"sku": "7890001", "quantidade": 1}], "forma_pagamento": "PIX"}
        compra.update(campos)
        return self.post("/api/conta/compras/", compra)


    def test_cpf_novo_cria_cliente_na_loja_online_e_ja_entra(self):
        r = self.criar_acesso(cpf="390.533.447-05", nome="João Lima")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["nome"], "João Lima")
        self.assertEqual(r.json()["loja_cadastro"], "Loja Online")
        self.assertEqual(self.client.get("/api/conta/").status_code, 200)

    def test_cpf_ja_cadastrado_ganha_acesso_se_o_nome_confere(self):
        r = self.criar_acesso(nome="  mariana  ")
        self.assertEqual(r.status_code, 201)
        self.mariana.refresh_from_db()
        self.assertIsNotNone(self.mariana.usuario)
        self.assertEqual(self.mariana.usuario.username, "52998224725")

    def test_nome_que_nao_confere_nao_toma_a_conta(self):
        r = self.criar_acesso(nome="Pedro")
        self.assertEqual(r.status_code, 400)
        self.assertIn("nome não confere", r.json()["erro"])
        self.mariana.refresh_from_db()
        self.assertIsNone(self.mariana.usuario)

    def test_cpf_com_acesso_nao_cria_outro(self):
        self.criar_acesso()
        r = self.criar_acesso(senha="outra-senha-forte-99")
        self.assertEqual(r.status_code, 400)
        self.assertIn("já tem acesso", r.json()["erro"])

    def test_senha_fraca_ou_cpf_invalido_sao_recusados(self):
        self.assertEqual(self.criar_acesso(senha="123").status_code, 400)
        self.assertEqual(self.criar_acesso(cpf="111").status_code, 400)
        self.mariana.refresh_from_db()
        self.assertIsNone(self.mariana.usuario)

    def test_entrar_com_senha_certa_e_errada(self):
        self.criar_acesso()
        self.post("/api/conta/sair/", {})
        self.assertEqual(self.client.get("/api/conta/").status_code, 401)

        errada = self.post("/api/conta/entrar/", {"cpf": "529.982.247-25", "senha": "nao-e-essa"})
        self.assertEqual(errada.status_code, 400)
        self.assertEqual(errada.json()["erro"], "CPF ou senha incorretos.")

        certa = self.post("/api/conta/entrar/", {"cpf": "529.982.247-25", "senha": SENHA})
        self.assertEqual(certa.status_code, 200)
        self.assertEqual(certa.json()["nome"], "Mariana Souza")

    def test_rotas_da_conta_exigem_sessao(self):
        self.assertEqual(self.client.get("/api/conta/").status_code, 401)
        self.assertEqual(self.comprar().status_code, 401)

    def test_post_da_conta_exige_token_csrf(self):
        navegador = Client(enforce_csrf_checks=True)
        r = self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": SENHA}, client=navegador)
        self.assertEqual(r.status_code, 403)


    def test_compra_online_usa_o_cpf_da_sessao_e_gera_pontos(self):
        self.criar_acesso()
        outro = services.cadastrar_cliente("39053344705", "João Lima", self.loja)
        r = self.comprar(cpf=outro.cpf)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["pontos_ganhos"], 289)
        self.assertEqual(r.json()["saldo_atual"], 289)

        compra = Compra.objects.get(id=r.json()["id"])
        self.assertEqual(compra.cliente, self.mariana)
        self.assertEqual(compra.caixa.codigo, services.CODIGO_CAIXA_ONLINE)
        self.assertEqual(services.saldo(outro), 0)

    def test_compra_online_com_resgate_segue_as_regras(self):
        self.criar_acesso()
        services.registrar_venda(self.caixa, [{"sku": "7890001", "quantidade": 1}], "PIX", self.mariana.cpf)
        r = self.comprar(pontos_resgate=200)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["desconto"], 10.0)
        self.assertEqual(r.json()["valor_pago"], 279.90)
        self.assertEqual(self.comprar(pontos_resgate=150).status_code, 400)

    def test_compra_online_so_aceita_pix_ou_credito(self):
        self.criar_acesso()
        r = self.comprar(forma_pagamento="DINHEIRO")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Pix ou cartão", r.json()["erro"])

    def test_compra_online_e_idempotente_pelo_id(self):
        self.criar_acesso()
        id = str(uuid.uuid4())
        self.assertEqual(self.comprar(id=id).status_code, 201)
        self.assertEqual(self.comprar(id=id).status_code, 200)
        self.assertEqual(Compra.objects.filter(cliente=self.mariana).count(), 1)

    def test_nao_ve_nem_reaproveita_compra_de_outro_cliente(self):
        outro = services.cadastrar_cliente("39053344705", "João Lima", self.loja)
        compra, _ = services.registrar_venda(self.caixa, [{"sku": "7890002", "quantidade": 1}], "PIX", outro.cpf)
        self.criar_acesso()
        self.assertEqual(self.client.get(f"/api/conta/compras/{compra.id}/").status_code, 404)
        self.assertEqual(self.comprar(id=str(compra.id)).status_code, 404)

    def test_detalhe_da_propria_compra(self):
        self.criar_acesso()
        id = self.comprar().json()["id"]
        detalhe = self.client.get(f"/api/conta/compras/{id}/").json()
        self.assertEqual(detalhe["itens"][0]["nome"], "Tênis Runner")
        self.assertEqual(detalhe["caixa"], "Loja online")


    def test_alterar_senha_exige_a_atual_e_mantem_a_sessao(self):
        self.criar_acesso()
        errada = self.post("/api/conta/senha/", {"senha_atual": "nao-e-essa", "nova_senha": "bota-preta-2027"})
        self.assertEqual(errada.status_code, 400)
        self.assertIn("senha atual", errada.json()["erro"])
        self.assertEqual(
            self.post("/api/conta/senha/", {"senha_atual": SENHA, "nova_senha": "123"}).status_code, 400
        )

        ok = self.post("/api/conta/senha/", {"senha_atual": SENHA, "nova_senha": "bota-preta-2027"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.client.get("/api/conta/").status_code, 200)

        self.post("/api/conta/sair/", {})
        antiga = self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": SENHA})
        nova = self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": "bota-preta-2027"})
        self.assertEqual(antiga.status_code, 400)
        self.assertEqual(nova.status_code, 200)


    def test_painel_traz_progresso_pontos_a_vencer_economia_e_mais_comprados(self):
        self.criar_acesso()
        antes = timezone.now() - timedelta(days=350)
        services.registrar_venda(
            self.caixa, [{"sku": "7890001", "quantidade": 2}], "PIX", self.mariana.cpf, data=antes
        )  # 579 pontos que vencem em 15 dias
        self.comprar(itens=[{"sku": "7890002", "quantidade": 3}], pontos_resgate=100)

        painel = self.client.get("/api/conta/").json()
        self.assertEqual(painel["pontos_12m"], 579 + 54)
        self.assertEqual(painel["progresso_nivel"], round(100 * 633 / 1000))
        self.assertEqual(painel["a_vencer"]["pontos"], 479)
        self.assertIsNotNone(painel["a_vencer"]["proxima_data"])
        self.assertEqual(painel["economia"], 5.0)
        self.assertEqual([p["sku"] for p in painel["mais_comprados"]], ["7890002", "7890001"])
        self.assertEqual(painel["cpf"], "***.982.247-**")
        self.assertEqual(MovimentoPontos.objects.filter(tipo="EXPIRACAO").count(), 0)

    def test_perfil_guarda_numeracao_nascimento_e_quando_autorizou_contato(self):
        self.criar_acesso()
        r = self.post("/api/conta/perfil/", {"numeracao": 39, "nascimento": "1994-03-12", "aceita_contato": True})
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["numeracao"], r.json()["nascimento"]), (39, "1994-03-12"))
        self.mariana.refresh_from_db()
        autorizado = self.mariana.contato_autorizado_em
        self.assertIsNotNone(autorizado)

        # Salvar de novo com a autorização marcada mantém a data original (prova do consentimento).
        self.post("/api/conta/perfil/", {"numeracao": 40, "nascimento": "1994-03-12", "aceita_contato": True})
        self.mariana.refresh_from_db()
        self.assertEqual((self.mariana.numeracao, self.mariana.contato_autorizado_em), (40, autorizado))

        # Desmarcar apaga a autorização; campos vazios apagam numeração e nascimento.
        self.post("/api/conta/perfil/", {"numeracao": "", "nascimento": "", "aceita_contato": False})
        self.mariana.refresh_from_db()
        self.assertEqual(
            (self.mariana.numeracao, self.mariana.nascimento, self.mariana.contato_autorizado_em), (None, None, None)
        )

    def test_perfil_invalido_da_400_e_nao_grava(self):
        self.criar_acesso()
        for dados in (
            {"numeracao": 60, "nascimento": None, "aceita_contato": False},
            {"numeracao": 39, "nascimento": "12/03/1994", "aceita_contato": False},
            {"numeracao": 39, "nascimento": "2999-01-01", "aceita_contato": False},
            {"numeracao": 39, "nascimento": None, "aceita_contato": "sim"},
        ):
            self.assertEqual(self.post("/api/conta/perfil/", dados).status_code, 400)
        self.mariana.refresh_from_db()
        self.assertIsNone(self.mariana.numeracao)
        self.assertEqual(self.post("/api/conta/perfil/", {}, client=Client()).status_code, 401)

    def test_painel_conta_os_produtos_que_faltam_avaliar(self):
        self.criar_acesso()
        vazio = self.client.get("/api/conta/").json()["avaliacoes_pendentes"]
        self.assertEqual(vazio, {"quantidade": 0, "pontos": 0, "ultima_compra": None})

        self.comprar(itens=[{"sku": "7890001", "quantidade": 1}, {"sku": "7890002", "quantidade": 2}])
        services.avaliar_produto(self.mariana, "7890002", 5, "Meia macia e não esquenta o pé.")
        pendentes = self.client.get("/api/conta/").json()["avaliacoes_pendentes"]
        self.assertEqual((pendentes["quantidade"], pendentes["pontos"]), (1, regras.PONTOS_POR_AVALIACAO))
        self.assertIsNotNone(pendentes["ultima_compra"])
