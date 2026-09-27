from django.contrib.auth.models import User


# As rotas da loja (PDV e gestão) só respondem para a equipe logada: os testes delas entram com um
# usuário da equipe antes de chamar a API.
def entrar_como_equipe(client):
    equipe = User.objects.create_user("gerente-teste", password="uma-senha-qualquer", is_staff=True)
    client.force_login(equipe)
    return equipe
