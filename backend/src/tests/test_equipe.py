import json
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.test import Client, TestCase

from src import services
from src.models import Caixa, Loja, Produto

SENHA = "Calcados#2026"

ROTAS_DA_LOJA = [
    "/api/dashboard/",
    "/api/acoes/",
    "/api/clientes/",
    "/api/clientes/1/perfil/",
    "/api/clientes/52998224725/",
    "/api/vendas/",
    "/api/vendas/7c9e6679-7425-40de-944b-e07fc1f90ae7/",
    "/api/avaliacoes/",
    "/api/estoque/",
]


class AdministradorTest(TestCase):
    def test_cria_administrador_da_equipe(self):
        admin = services.criar_administrador("gerente", SENHA, "Paula Lima")
        self.assertTrue(admin.is_staff and admin.is_superuser)
        self.assertTrue(admin.check_password(SENHA))
        self.assertEqual(admin.first_name, "Paula Lima")

    def test_nao_sobrescreve_sem_redefinir(self):
        services.criar_administrador("gerente", SENHA)
        with self.assertRaisesMessage(services.RegraViolada, "já existe"):
            services.criar_administrador("gerente", "Outra#Senha2026")
        self.assertTrue(User.objects.get(username="gerente").check_password(SENHA))

    def test_redefinir_troca_a_senha(self):
        services.criar_administrador("gerente", SENHA)
        services.criar_administrador("gerente", "Outra#Senha2026", redefinir=True)
        self.assertTrue(User.objects.get(username="gerente").check_password("Outra#Senha2026"))

    def test_recusa_usuario_vazio_so_numeros_e_senha_fraca(self):
        with self.assertRaisesMessage(services.RegraViolada, "Informe o nome de usuário."):
            services.criar_administrador("  ", SENHA)
        with self.assertRaisesMessage(services.RegraViolada, "CPF"):
            services.criar_administrador("52998224725", SENHA)
        with self.assertRaises(services.RegraViolada):
            services.criar_administrador("gerente", "123")
        self.assertFalse(User.objects.filter(username="gerente").exists())

    def test_usuario_de_cliente_nao_vira_administrador(self):
        cliente = services.criar_acesso("52998224725", "Mariana Souza", SENHA)
        with self.assertRaisesMessage(services.RegraViolada, "cliente"):
            services.criar_administrador(cliente.usuario.username, SENHA, redefinir=True)
        self.assertFalse(User.objects.get(pk=cliente.usuario.pk).is_staff)

    def test_comando_cria_e_redefine(self):
        saida = StringIO()
        call_command("criar_admin", usuario="gerente", senha=SENHA, nome="Paula", stdout=saida)
        self.assertIn('"gerente" criado', saida.getvalue())
        with self.assertRaises(CommandError):
            call_command("criar_admin", usuario="gerente", senha=SENHA, stdout=StringIO())
        call_command("criar_admin", usuario="gerente", senha="Outra#Senha2026", redefinir=True, stdout=saida)
        self.assertIn('"gerente" atualizado', saida.getvalue())


class LoginDaEquipeTest(TestCase):
    def setUp(self):
        services.criar_administrador("gerente", SENHA, "Paula Lima")

    def post(self, url, dados, client=None):
        return (client or self.client).post(url, json.dumps(dados), content_type="application/json")

    def test_rotas_da_loja_pedem_login(self):
        for rota in ROTAS_DA_LOJA:
            with self.subTest(rota=rota):
                self.assertEqual(self.client.get(rota).status_code, 401)
        self.assertEqual(self.post("/api/estoque/7890001/", {"quantidade": 1, "minimo": 1}).status_code, 401)

    def test_catalogo_continua_aberto_para_a_loja_online(self):
        self.assertEqual(self.client.get("/api/produtos/").status_code, 200)

    def test_entrar_da_acesso_e_sair_tira(self):
        self.assertEqual(self.client.get("/api/equipe/").status_code, 401)
        r = self.post("/api/equipe/entrar/", {"usuario": "gerente", "senha": SENHA})
        self.assertEqual(r.json(), {"usuario": "gerente", "nome": "Paula Lima"})
        self.assertEqual(self.client.get("/api/equipe/").json()["usuario"], "gerente")
        self.assertEqual(self.client.get("/api/estoque/").status_code, 200)

        self.post("/api/equipe/sair/", {})
        self.assertEqual(self.client.get("/api/estoque/").status_code, 401)

    def test_senha_errada_nao_entra(self):
        r = self.post("/api/equipe/entrar/", {"usuario": "gerente", "senha": "errada"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["erro"], "Usuário ou senha incorretos.")

    def test_cliente_nao_entra_na_area_da_loja(self):
        services.criar_acesso("52998224725", "Mariana Souza", SENHA)
        r = self.post("/api/equipe/entrar/", {"usuario": "52998224725", "senha": SENHA})
        self.assertEqual(r.status_code, 400)
        self.post("/api/conta/entrar/", {"cpf": "52998224725", "senha": SENHA})
        self.assertEqual(self.client.get("/api/dashboard/").status_code, 401)

    # Com sessão, um POST sem o token CSRF (ex.: vindo de outro site) é recusado.
    def test_post_da_loja_exige_csrf(self):
        loja = Loja.objects.create(nome="Loja Centro", cidade="Araras")
        Caixa.objects.create(codigo="centro-01", nome="Caixa 01", loja=loja)
        Produto.objects.create(sku="7890001", nome="Tênis Runner", preco="289.90")
        navegador = Client(enforce_csrf_checks=True)
        navegador.force_login(User.objects.get(username="gerente"))
        venda = {"caixa": "centro-01", "itens": [{"sku": "7890001", "quantidade": 1}], "forma_pagamento": "PIX"}

        self.assertEqual(self.post("/api/vendas/", venda, navegador).status_code, 403)

        navegador.get("/api/equipe/")
        token = navegador.cookies["csrftoken"].value
        r = navegador.post("/api/vendas/", json.dumps(venda), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 201)
