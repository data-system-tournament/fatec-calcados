import unicodedata
import uuid
from decimal import Decimal

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import Greatest
from django.utils import timezone

from . import cpf as cpf_utils
from . import regras
from .models import (
    Avaliacao, Caixa, Cliente, Compra, EstoqueNumeracao, FormaPagamento, ItemCompra, Loja, MovimentoPontos, Produto,
)

Tipo = MovimentoPontos.Tipo


class RegraViolada(Exception):
    pass


def saldo(cliente: Cliente, ate=None) -> int:
    movimentos = cliente.movimentos.all()
    if ate is not None:
        movimentos = movimentos.filter(data__lte=ate)
    return movimentos.aggregate(total=Sum("pontos"))["total"] or 0


def pontos_12m(cliente: Cliente, em=None) -> int:
    em = em or timezone.now()
    return (
        cliente.movimentos.filter(
            tipo=Tipo.ACUMULO, data__gt=em - regras.JANELA_NIVEL, data__lte=em
        ).aggregate(total=Sum("pontos"))["total"]
        or 0
    )


def nivel_atual(cliente: Cliente, em=None) -> str:
    return regras.nivel_por_pontos(pontos_12m(cliente, em))


def cadastrar_cliente(cpf, nome, loja: Loja | None = None, data=None) -> Cliente:
    numero = cpf_utils.limpar(cpf)
    if not cpf_utils.validar(numero):
        raise RegraViolada("CPF inválido. Confira os números.")
    if not nome or not nome.strip():
        raise RegraViolada("Informe o nome do cliente.")
    if Cliente.objects.filter(cpf=numero).exists():
        raise RegraViolada("Esse CPF já está cadastrado.")
    return Cliente.objects.create(
        cpf=numero, nome=nome.strip(), loja_cadastro=loja, cadastrado_em=data or timezone.now()
    )


# Feito com IA: zera os lotes vencidos e registra a EXPIRACAO na data em que o lote venceu.
# select_for_update trava os lotes para duas consultas simultâneas não expirarem o mesmo lote duas vezes.
@transaction.atomic
def expirar_pontos(cliente: Cliente, ate=None) -> int:
    ate = ate or timezone.now()
    vencidos = cliente.movimentos.select_for_update().filter(
        tipo=Tipo.ACUMULO, restante__gt=0, expira_em__lte=ate
    ).order_by("expira_em", "id")
    total = 0
    for lote in vencidos:
        MovimentoPontos.objects.create(
            cliente=cliente, tipo=Tipo.EXPIRACAO, pontos=-lote.restante, data=lote.expira_em
        )
        total += lote.restante
        lote.restante = 0
        lote.save(update_fields=["restante"])
    return total


# Feito com IA: resgate FIFO, tira os pontos dos lotes mais antigos primeiro.
def _consumir_lotes(cliente: Cliente, pontos: int, em):
    falta = pontos
    lotes = cliente.movimentos.filter(
        tipo=Tipo.ACUMULO, restante__gt=0, expira_em__gt=em
    ).order_by("data", "id")
    for lote in lotes:
        usar = min(falta, lote.restante)
        lote.restante -= usar
        lote.save(update_fields=["restante"])
        falta -= usar
        if falta == 0:
            return
    raise RegraViolada("Saldo de pontos insuficiente.")


# Feito com IA: aplica as regras nesta ordem: expira vencidos -> valida o resgate ->
# nível de ANTES da compra -> pontos sobre o valor pago -> grava compra, resgate e novo lote.
# transaction.atomic: se qualquer passo falhar, nada é gravado.
@transaction.atomic
def registrar_compra(
    cpf, loja: Loja, valor_bruto, pontos_resgate: int = 0, data=None,
    *, caixa: Caixa | None = None, forma_pagamento: str = "", id=None,
) -> Compra:
    data = data or timezone.now()
    try:
        valor_bruto = Decimal(str(valor_bruto)).quantize(Decimal("0.01"))
    except Exception:
        raise RegraViolada("Valor da compra inválido.")
    if valor_bruto <= 0:
        raise RegraViolada("O valor da compra precisa ser maior que zero.")

    try:
        pontos_resgate = int(pontos_resgate or 0)
    except (TypeError, ValueError):
        raise RegraViolada("Quantidade de pontos para resgate inválida.")

    try:
        cliente = Cliente.objects.select_for_update().get(cpf=cpf_utils.limpar(cpf))
    except Cliente.DoesNotExist:
        raise RegraViolada("CPF não cadastrado no programa.")

    expirar_pontos(cliente, data)

    if pontos_resgate < 0 or pontos_resgate % regras.BLOCO_RESGATE != 0:
        raise RegraViolada(f"O resgate precisa ser em múltiplos de {regras.BLOCO_RESGATE} pontos.")
    disponivel = saldo(cliente)
    if pontos_resgate > disponivel:
        raise RegraViolada(f"Saldo insuficiente: o cliente tem {disponivel} pontos.")
    desconto = regras.desconto_do_resgate(pontos_resgate)
    if desconto > valor_bruto:
        raise RegraViolada("O desconto dos pontos não pode ser maior que o valor da compra.")

    valor_pago = valor_bruto - desconto
    nivel = nivel_atual(cliente, data)
    ganhos = regras.calcular_pontos(valor_pago, nivel)

    compra = Compra.objects.create(
        id=id or uuid.uuid4(),
        cliente=cliente,
        loja=loja,
        caixa=caixa,
        forma_pagamento=forma_pagamento,
        data=data,
        valor_bruto=valor_bruto,
        pontos_resgatados=pontos_resgate,
        desconto=desconto,
        valor_pago=valor_pago,
        nivel_na_compra=nivel,
        pontos_ganhos=ganhos,
    )

    if pontos_resgate:
        _consumir_lotes(cliente, pontos_resgate, data)
        MovimentoPontos.objects.create(
            cliente=cliente, compra=compra, tipo=Tipo.RESGATE, pontos=-pontos_resgate, data=data
        )

    if ganhos:
        MovimentoPontos.objects.create(
            cliente=cliente,
            compra=compra,
            tipo=Tipo.ACUMULO,
            pontos=ganhos,
            restante=ganhos,
            data=data,
            expira_em=data + regras.VALIDADE_PONTOS,
        )

    return compra


# Feito com IA: cada item traz sku, quantidade e, no calçado, a numeração (que precisa existir na grade do
# produto). Devolve (produto, quantidade, numeracao); numeracao é None no acessório.
def _itens_da_venda(itens):
    if not itens:
        raise RegraViolada("A venda precisa ter pelo menos um item.")

    linhas = []
    for item in itens:
        try:
            sku = str(item["sku"])
            quantidade = int(item["quantidade"])
            numeracao = item.get("numeracao")
        except (KeyError, TypeError, ValueError, AttributeError):
            raise RegraViolada("Cada item precisa de sku e quantidade.")
        if quantidade < 1:
            raise RegraViolada("A quantidade de cada item precisa ser pelo menos 1.")

        produto = Produto.objects.filter(sku=sku, ativo=True).first()
        if produto is None:
            raise RegraViolada(f"Produto {sku} não encontrado.")
        problema = regras.problema_da_numeracao(produto.usa_numeracao, numeracao)
        if problema:
            raise RegraViolada(f"{produto.nome}: {problema}")
        if numeracao is not None and not produto.numeracoes.filter(numeracao=numeracao).exists():
            raise RegraViolada(f"{produto.nome}: não trabalhamos com a numeração {numeracao}.")
        linhas.append((produto, quantidade, numeracao))
    return linhas


# Feito com IA: venda do caixa. O preço vem do banco (o caixa manda só sku, quantidade e numeração).
# Se o mesmo `id` chegar de novo (venda offline reenviada), devolve a venda existente sem duplicar.
# `conferir_estoque` só vem ligado da loja online (ver comprar_online); o caixa nunca recusa por estoque.
@transaction.atomic
def registrar_venda(
    caixa: Caixa, itens, forma_pagamento: str, cpf=None, pontos_resgate: int = 0, data=None, id=None,
    conferir_estoque=False,
):
    if id is not None:
        try:
            id = uuid.UUID(str(id))
        except ValueError:
            raise RegraViolada("Identificador da venda inválido.")
        existente = Compra.objects.filter(id=id).first()
        if existente:
            return existente, False

    if forma_pagamento not in FormaPagamento.values:
        raise RegraViolada("Forma de pagamento inválida.")

    linhas = _itens_da_venda(itens)
    if conferir_estoque:
        _conferir_estoque(linhas)
    valor_bruto = sum(produto.preco * quantidade for produto, quantidade, _n in linhas)

    if cpf:
        compra = registrar_compra(
            cpf, caixa.loja, valor_bruto, pontos_resgate, data,
            caixa=caixa, forma_pagamento=forma_pagamento, id=id,
        )
    else:
        if pontos_resgate:
            raise RegraViolada("Para usar pontos, informe o CPF do cliente.")
        compra = Compra.objects.create(
            id=id or uuid.uuid4(),
            loja=caixa.loja,
            caixa=caixa,
            forma_pagamento=forma_pagamento,
            data=data or timezone.now(),
            valor_bruto=valor_bruto,
            valor_pago=valor_bruto,
        )

    ItemCompra.objects.bulk_create([
        ItemCompra(compra=compra, produto=produto, quantidade=quantidade, preco_unitario=produto.preco, numeracao=numeracao)
        for produto, quantidade, numeracao in linhas
    ])
    _baixar_estoque(linhas)
    return compra, True


# Feito com IA: na loja online não há produto na mão do cliente, então só vende o que tem. Soma o pedido por
# produto e numeração (o mesmo número pode vir em duas linhas) e trava as linhas de estoque até o fim da venda,
# para duas compras ao mesmo tempo não levarem o último par.
def _conferir_estoque(linhas):
    pedido = {}
    for produto, quantidade, numeracao in linhas:
        pedido[(produto, numeracao)] = pedido.get((produto, numeracao), 0) + quantidade
    for (produto, numeracao), quantidade in pedido.items():
        if numeracao is None:
            disponivel = Produto.objects.select_for_update().get(pk=produto.pk).estoque
            rotulo = produto.nome
        else:
            disponivel = EstoqueNumeracao.objects.select_for_update().get(produto=produto, numeracao=numeracao).quantidade
            rotulo = f"{produto.nome} nº {numeracao}"
        if quantidade > disponivel:
            if disponivel == 0:
                raise RegraViolada(f"{rotulo} esgotou. Tire do carrinho ou escolha outra numeração.")
            raise RegraViolada(f"Só temos {disponivel} de {rotulo}. Diminua a quantidade no carrinho.")


# Feito com IA: a venda tira do estoque, mas nunca é recusada por falta dele no caixa: lá o produto já está
# na mão do cliente (e a venda offline chega depois), então um estoque zerado só quer dizer que a contagem
# está errada. Greatest segura em zero; o F() subtrai no banco, sem perder vendas simultâneas. O calçado
# desconta da numeração vendida; o acessório, do número único do produto.
def _baixar_estoque(linhas):
    for produto, quantidade, numeracao in linhas:
        if numeracao is None:
            Produto.objects.filter(pk=produto.pk).update(estoque=Greatest(F("estoque") - quantidade, 0))
        else:
            EstoqueNumeracao.objects.filter(produto=produto, numeracao=numeracao).update(
                quantidade=Greatest(F("quantidade") - quantidade, 0)
            )


# Feito com IA: contagem feita pelo gerente (tela Estoque). Grava a quantidade que está na prateleira e o
# mínimo. No calçado, a contagem é de uma numeração (que entra na grade se ainda não estava) e o mínimo vale
# para cada numeração do produto.
@transaction.atomic
def ajustar_estoque(sku, quantidade, minimo, numeracao=None) -> Produto:
    produto = Produto.objects.filter(sku=str(sku or "").strip()).first()
    if produto is None:
        raise RegraViolada("Produto não encontrado.")
    problema = regras.problema_do_estoque(quantidade, minimo) or regras.problema_da_numeracao(
        produto.usa_numeracao, numeracao
    )
    if problema:
        raise RegraViolada(problema)
    if produto.usa_numeracao:
        EstoqueNumeracao.objects.update_or_create(
            produto=produto, numeracao=numeracao, defaults={"quantidade": quantidade}
        )
    else:
        produto.estoque = quantidade
    produto.estoque_minimo = minimo
    produto.save(update_fields=["estoque", "estoque_minimo"])
    return produto



# ---------- Área do cliente (loja online) ----------

CODIGO_CAIXA_ONLINE = "online-01"
PAGAMENTOS_ONLINE = (FormaPagamento.PIX, FormaPagamento.CREDITO)


# A loja online é um caixa como os outros; é criada na primeira vez que alguém precisa dela
# (o seed apaga e recria as lojas, então ela não pode depender de uma migração de dados).
def caixa_online() -> Caixa:
    caixa = Caixa.objects.select_related("loja").filter(codigo=CODIGO_CAIXA_ONLINE).first()
    if caixa:
        return caixa
    loja = Loja.objects.create(nome="Loja Online", cidade="Internet")
    return Caixa.objects.create(codigo=CODIGO_CAIXA_ONLINE, nome="Loja online", loja=loja)


def _primeiro_nome(nome) -> str:
    texto = unicodedata.normalize("NFD", str(nome or "").strip().lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto.split()[0] if texto.split() else ""


# Feito com IA: cria o acesso (CPF + senha) de um cliente. CPF novo vira cadastro na loja online.
# CPF que já está no programa (cadastrado no caixa) só ganha acesso se o primeiro nome conferir,
# para ninguém tomar a conta de outra pessoa sabendo apenas o CPF.
@transaction.atomic
def criar_acesso(cpf, nome, senha) -> Cliente:
    numero = cpf_utils.limpar(cpf)
    if not cpf_utils.validar(numero):
        raise RegraViolada("CPF inválido. Confira os números.")

    cliente = Cliente.objects.select_for_update().filter(cpf=numero).first()
    if cliente and cliente.usuario_id:
        raise RegraViolada("Esse CPF já tem acesso. Entre com sua senha.")
    if cliente and _primeiro_nome(nome) != _primeiro_nome(cliente.nome):
        raise RegraViolada("O nome não confere com o cadastro desse CPF.")

    usuario = User(username=numero, first_name=(nome or "").strip()[:150])
    try:
        validate_password(senha or "", usuario)
    except ValidationError as e:
        raise RegraViolada(" ".join(e.messages))

    if cliente is None:
        cliente = cadastrar_cliente(numero, nome, caixa_online().loja)

    # Usuário que sobrou de um cliente apagado (ex.: pelo seed); nunca mexe em contas da equipe.
    User.objects.filter(username=numero, cliente__isnull=True, is_staff=False).delete()
    usuario.set_password(senha)
    usuario.save()
    cliente.usuario = usuario
    cliente.save(update_fields=["usuario"])
    return cliente


def autenticar_cliente(request, cpf, senha) -> Cliente:
    usuario = authenticate(request, username=cpf_utils.limpar(cpf), password=senha or "")
    cliente = getattr(usuario, "cliente", None) if usuario else None
    if cliente is None:
        raise RegraViolada("CPF ou senha incorretos.")
    login(request, usuario)
    return cliente


# Feito com IA: compra feita pelo próprio cliente. O CPF vem do cliente da sessão (nunca do corpo da
# requisição) e a venda passa pelo mesmo registrar_venda do PDV: mesmas regras de preço, pontos e resgate.
# A diferença é o estoque: a loja online só vende o que tem (conferir_estoque).
def comprar_online(cliente: Cliente, itens, forma_pagamento: str, pontos_resgate: int = 0, id=None):
    if forma_pagamento not in PAGAMENTOS_ONLINE:
        raise RegraViolada("Na loja online o pagamento é por Pix ou cartão de crédito.")
    return registrar_venda(
        caixa_online(), itens, forma_pagamento, cliente.cpf, pontos_resgate, id=id, conferir_estoque=True
    )


# Feito com IA: troca de senha na "Minha conta". Pede a senha atual (quem pegou o computador logado
# não troca a senha sozinho) e aplica os mesmos validadores do cadastro.
def alterar_senha(cliente: Cliente, senha_atual, nova_senha):
    usuario = cliente.usuario
    if usuario is None or not usuario.check_password(senha_atual or ""):
        raise RegraViolada("A senha atual não confere.")
    try:
        validate_password(nova_senha or "", usuario)
    except ValidationError as e:
        raise RegraViolada(" ".join(e.messages))
    usuario.set_password(nova_senha)
    usuario.save(update_fields=["password"])
    return usuario


# Feito com IA: numeração, nascimento e autorização de contato, preenchidos pelo cliente no perfil. A
# autorização guarda QUANDO foi dada (prova pedida pela LGPD): marcar de novo não muda a data, e
# desmarcar apaga, porque o cliente desistiu.
def atualizar_perfil(cliente: Cliente, numeracao, nascimento, aceita_contato, agora=None) -> Cliente:
    agora = agora or timezone.now()
    problema = regras.problema_do_perfil(numeracao, nascimento, timezone.localdate(agora))
    if problema:
        raise RegraViolada(problema)
    if type(aceita_contato) is not bool:
        raise RegraViolada("Diga se aceita ou não receber ofertas.")

    cliente.numeracao = numeracao
    cliente.nascimento = nascimento
    if not aceita_contato:
        cliente.contato_autorizado_em = None
    elif cliente.contato_autorizado_em is None:
        cliente.contato_autorizado_em = agora
    cliente.save(update_fields=["numeracao", "nascimento", "contato_autorizado_em"])
    return cliente


# Feito com IA: avaliação de produto com pontos. Ordem: trava o cliente (dois envios ao mesmo tempo não
# rendem pontos em dobro) -> produto existe -> o cliente comprou o produto (no caixa ou online) -> ainda
# não avaliou -> nota e comentário válidos (regras.problema_da_avaliacao) -> grava o lote de pontos e a
# avaliação. O lote é um ACUMULO comum: vale 12 meses, é usado no resgate FIFO e conta para o nível.
@transaction.atomic
def avaliar_produto(cliente: Cliente, sku, nota, comentario, data=None) -> Avaliacao:
    data = data or timezone.now()
    cliente = Cliente.objects.select_for_update().get(pk=cliente.pk)

    produto = Produto.objects.filter(sku=str(sku or "").strip()).first()
    if produto is None:
        raise RegraViolada("Produto não encontrado.")
    if not ItemCompra.objects.filter(compra__cliente=cliente, produto=produto, compra__data__lte=data).exists():
        raise RegraViolada("Você só pode avaliar produtos que comprou.")
    if cliente.avaliacoes.filter(produto=produto).exists():
        raise RegraViolada("Você já avaliou este produto.")
    problema = regras.problema_da_avaliacao(nota, comentario)
    if problema:
        raise RegraViolada(problema)

    lote = MovimentoPontos.objects.create(
        cliente=cliente,
        tipo=Tipo.ACUMULO,
        pontos=regras.PONTOS_POR_AVALIACAO,
        restante=regras.PONTOS_POR_AVALIACAO,
        data=data,
        expira_em=data + regras.VALIDADE_PONTOS,
    )
    return Avaliacao.objects.create(
        cliente=cliente, produto=produto, nota=nota, comentario=comentario.strip(), criada_em=data, movimento=lote
    )


# ---------- Equipe da loja (área /admin) ----------

# Feito com IA: cria (ou, com redefinir=True, atualiza a senha de) um administrador da loja: um User do
# Django com is_staff e is_superuser, que entra na área /admin do sistema e também no admin do Django.
# Usuário só com números é recusado porque o username dos clientes é o CPF; assim os dois nunca se
# confundem. A senha passa pelos mesmos validadores do cadastro do cliente.
def criar_administrador(usuario, senha, nome="", redefinir=False) -> User:
    usuario = str(usuario or "").strip()
    if not usuario:
        raise RegraViolada("Informe o nome de usuário.")
    if usuario.isdigit():
        raise RegraViolada("Use letras no nome de usuário: só números fica reservado para o CPF dos clientes.")

    existente = User.objects.filter(username=usuario).first()
    if existente and not redefinir:
        raise RegraViolada(f'O usuário "{usuario}" já existe. Use --redefinir para trocar a senha dele.')
    if existente and hasattr(existente, "cliente"):
        raise RegraViolada(f'O usuário "{usuario}" é de um cliente e não pode virar administrador.')

    admin = existente or User(username=usuario)
    if nome:
        admin.first_name = str(nome).strip()[:150]
    try:
        validate_password(senha or "", admin)
    except ValidationError as e:
        raise RegraViolada(" ".join(e.messages))
    admin.is_staff = True
    admin.is_superuser = True
    admin.is_active = True
    admin.set_password(senha)
    admin.save()
    return admin


# Entrada da equipe em /admin/entrar. Só usuários da equipe (is_staff): o login de cliente não serve aqui.
def autenticar_equipe(request, usuario, senha) -> User:
    user = authenticate(request, username=str(usuario or "").strip(), password=senha or "")
    if user is None or not user.is_staff:
        raise RegraViolada("Usuário ou senha incorretos.")
    login(request, user)
    return user


# Feito com IA: "Excluir minha conta" (LGPD, direito de eliminação). Pede a senha (quem pegou o computador
# logado não apaga a conta de outra pessoa). Ordem: expira os lotes vencidos -> cancela os pontos que ainda
# valem, como EXPIRACAO (o saldo vira zero e o custo em aberto do programa cai junto) -> troca nome e CPF
# por marcadores e apaga numeração, nascimento e autorização de contato -> apaga o login. As vendas ficam,
# sem ninguém ligado a elas, e as avaliações também, assinadas como "Cliente excluído".
@transaction.atomic
def excluir_conta(cliente: Cliente, senha, agora=None) -> Cliente:
    agora = agora or timezone.now()
    cliente = Cliente.objects.select_for_update().get(pk=cliente.pk)
    usuario = cliente.usuario
    if usuario is None or not usuario.check_password(senha or ""):
        raise RegraViolada("A senha não confere.")

    expirar_pontos(cliente, agora)
    for lote in cliente.movimentos.filter(tipo=Tipo.ACUMULO, restante__gt=0):
        MovimentoPontos.objects.create(cliente=cliente, tipo=Tipo.EXPIRACAO, pontos=-lote.restante, data=agora)
        lote.restante = 0
        lote.save(update_fields=["restante"])

    cliente.nome = regras.NOME_DE_CONTA_EXCLUIDA
    cliente.cpf = regras.cpf_de_conta_excluida(cliente.pk)
    cliente.numeracao = None
    cliente.nascimento = None
    cliente.contato_autorizado_em = None
    cliente.usuario = None
    cliente.excluido_em = agora
    cliente.save()
    usuario.delete()
    return cliente
