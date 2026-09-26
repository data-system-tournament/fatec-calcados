import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from . import regras


class Nivel(models.TextChoices):
    BRONZE = regras.BRONZE, "Bronze"
    PRATA = regras.PRATA, "Prata"
    OURO = regras.OURO, "Ouro"


class FormaPagamento(models.TextChoices):
    PIX = "PIX", "Pix"
    CREDITO = "CREDITO", "Crédito"
    DEBITO = "DEBITO", "Débito"
    DINHEIRO = "DINHEIRO", "Dinheiro"


class Loja(models.Model):
    nome = models.CharField(max_length=80)
    cidade = models.CharField(max_length=80)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Caixa(models.Model):
    codigo = models.SlugField(max_length=40, unique=True, help_text="Ex.: araras-01")
    nome = models.CharField(max_length=40, help_text="Ex.: Caixa 01")
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="caixas")

    class Meta:
        ordering = ["loja__nome", "nome"]

    def __str__(self):
        return f"{self.nome} ({self.loja})"


class Produto(models.Model):
    sku = models.CharField("código", max_length=20, unique=True)
    nome = models.CharField(max_length=120)
    preco = models.DecimalField("preço", max_digits=10, decimal_places=2)
    ativo = models.BooleanField(default=True, help_text="Produtos inativos não aparecem no caixa")

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.sku})"


class Cliente(models.Model):
    cpf = models.CharField("CPF", max_length=11, unique=True, help_text="Só números")
    nome = models.CharField(max_length=120)
    cadastrado_em = models.DateTimeField(default=timezone.now)
    loja_cadastro = models.ForeignKey(Loja, on_delete=models.PROTECT, null=True, blank=True)
    # Acesso à área do cliente (CPF + senha). O User do Django só guarda a senha; o username é o CPF.
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="cliente"
    )

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Compra(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(
        Cliente, on_delete=models.PROTECT, related_name="compras", null=True, blank=True
    )
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="compras")
    caixa = models.ForeignKey(
        Caixa, on_delete=models.PROTECT, related_name="compras", null=True, blank=True
    )
    forma_pagamento = models.CharField(max_length=10, choices=FormaPagamento.choices, blank=True)
    data = models.DateTimeField(db_index=True)
    valor_bruto = models.DecimalField(max_digits=10, decimal_places=2)
    pontos_resgatados = models.PositiveIntegerField(default=0)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valor_pago = models.DecimalField(max_digits=10, decimal_places=2)
    nivel_na_compra = models.CharField(max_length=10, choices=Nivel.choices, blank=True)
    pontos_ganhos = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-data"]

    def __str__(self):
        quem = self.cliente or "Venda sem CPF"
        return f"{quem} em {self.data:%d/%m/%Y} (R$ {self.valor_pago})"


class ItemCompra(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name="itens_vendidos")
    quantidade = models.PositiveIntegerField()
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome}"


# Feito com IA: livro-razão de pontos. Não existe campo "saldo": o saldo é a soma dos movimentos.
# ACUMULO (+) é um lote com validade; RESGATE (-) e EXPIRACAO (-) tiram pontos.
# `restante` guarda quanto de cada lote ainda não foi usado nem expirou (resgate FIFO e expiração por lote).
class MovimentoPontos(models.Model):
    class Tipo(models.TextChoices):
        ACUMULO = "ACUMULO", "Acúmulo"
        RESGATE = "RESGATE", "Resgate"
        EXPIRACAO = "EXPIRACAO", "Expiração"

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="movimentos")
    compra = models.ForeignKey(
        Compra, on_delete=models.PROTECT, null=True, blank=True, related_name="movimentos"
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    pontos = models.IntegerField(help_text="Positivo para acúmulo, negativo para resgate e expiração")
    data = models.DateTimeField(db_index=True)
    expira_em = models.DateTimeField(null=True, blank=True)
    restante = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["data", "id"]
        verbose_name = "movimento de pontos"
        verbose_name_plural = "movimentos de pontos"
        indexes = [models.Index(fields=["cliente", "tipo", "data"])]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.pontos:+} ({self.cliente})"



# Feito com IA: avaliação de um produto que o cliente comprou. Uma por cliente e produto (a restrição no
# banco garante isso mesmo com dois envios ao mesmo tempo). `movimento` é o lote de pontos que a avaliação
# rendeu; PROTECT porque o ledger não pode perder um movimento que ainda explica o saldo.
class Avaliacao(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="avaliacoes")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name="avaliacoes")
    nota = models.PositiveSmallIntegerField()
    comentario = models.TextField()
    criada_em = models.DateTimeField(default=timezone.now)
    movimento = models.OneToOneField(MovimentoPontos, on_delete=models.PROTECT, related_name="avaliacao")

    class Meta:
        ordering = ["-criada_em"]
        verbose_name = "avaliação"
        verbose_name_plural = "avaliações"
        constraints = [models.UniqueConstraint(fields=["cliente", "produto"], name="uma_avaliacao_por_produto")]

    def __str__(self):
        return f"{self.cliente} avaliou {self.produto.nome} ({self.nota}/5)"
