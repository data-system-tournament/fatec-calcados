import getpass

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from src import services


# Feito com IA: cria um administrador da loja, que entra em /admin/entrar (e também no admin do Django).
# Sem --senha, pergunta a senha duas vezes sem mostrar na tela, para ela não ficar no histórico do terminal.
# As regras (usuário válido, senha forte, não sobrescrever sem --redefinir) ficam em services.criar_administrador.
class Command(BaseCommand):
    help = "Cria um administrador da loja (login da área /admin). Com --redefinir, troca a senha de um que já existe."

    def add_arguments(self, parser):
        parser.add_argument("--usuario", required=True, help="Nome de usuário para o login (ex.: gerente)")
        parser.add_argument("--nome", default="", help="Nome da pessoa, mostrado no sistema")
        parser.add_argument("--senha", help="Senha (sem ela, o comando pergunta)")
        parser.add_argument("--redefinir", action="store_true", help="Troca a senha se o usuário já existir")

    def handle(self, *args, **opts):
        senha = opts["senha"]
        if senha is None:
            senha = getpass.getpass("Senha: ")
            if senha != getpass.getpass("Repita a senha: "):
                raise CommandError("As senhas não conferem.")

        ja_existia = User.objects.filter(username=str(opts["usuario"]).strip()).exists()
        try:
            admin = services.criar_administrador(opts["usuario"], senha, opts["nome"], redefinir=opts["redefinir"])
        except services.RegraViolada as e:
            raise CommandError(str(e))

        acao = "atualizado" if ja_existia else "criado"
        self.stdout.write(self.style.SUCCESS(
            f'Administrador "{admin.username}" {acao}. Entre em http://localhost:5173/admin/entrar'
        ))
