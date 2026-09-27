import getpass

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from src import cpf as cpf_utils
from src import services


# Feito com IA: cria o login de um cliente (o mesmo que a tela /cadastro faz), para testar a área do cliente
# sem abrir o navegador. As regras são as de services.criar_acesso: CPF válido; CPF novo vira cliente da Loja
# Online; CPF que já compra no caixa só ganha acesso se o primeiro nome bater com o cadastro. Sem --senha,
# pergunta duas vezes sem mostrar na tela, para ela não ficar no histórico do terminal. --numeracao já preenche
# o número do calçado do perfil (a página do produto marca esse número).
class Command(BaseCommand):
    help = "Cria o login (CPF + senha) de um cliente da loja online, como a tela /cadastro."

    def add_arguments(self, parser):
        parser.add_argument("--cpf", required=True, help="CPF do cliente (com ou sem pontos)")
        parser.add_argument("--nome", required=True, help="Nome completo")
        parser.add_argument("--senha", help="Senha (sem ela, o comando pergunta)")
        parser.add_argument("--numeracao", type=int, help="Número do calçado, para o perfil (ex.: 40)")

    def handle(self, *args, **opts):
        senha = opts["senha"]
        if senha is None:
            senha = getpass.getpass("Senha: ")
            if senha != getpass.getpass("Repita a senha: "):
                raise CommandError("As senhas não conferem.")

        try:
            with transaction.atomic():
                cliente = services.criar_acesso(opts["cpf"], opts["nome"], senha)
                if opts["numeracao"] is not None:
                    services.atualizar_perfil(cliente, opts["numeracao"], None, False)
        except services.RegraViolada as e:
            raise CommandError(str(e))

        self.stdout.write(self.style.SUCCESS(
            f"Cliente {cliente.nome} ({cpf_utils.formatar(cliente.cpf)}) pode entrar em http://localhost:5173/login"
        ))
