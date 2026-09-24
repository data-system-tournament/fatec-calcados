"""
Modelo de dados.

Ideia central: NÃO existe um campo "saldo" no cliente.
Todo ponto que entra ou sai vira uma linha em MovimentoPontos (um livro-razão).
O saldo é sempre a soma desses movimentos, então dá para auditar qualquer número.
"""
import uuid

from django.db import models
from django.utils import timezone

from . import regras


class Nivel(models.TextChoices):
    BRONZE = regras.BRONZE, "Bronze"
    PRATA = regras.PRATA, "Prata"
    OURO = regras.OURO, "Ouro"


class Loja(models.Model):
    nome = models.CharField(max_length=80)
    cidade = models.CharField(max_length=80)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Cliente(models.Model):
    cpf = models.CharField("CPF", max_length=11, unique=True, help_text="Só números")
    nome = models.CharField(max_length=120)
    cadastrado_em = models.DateTimeField(default=timezone.now)
    loja_cadastro = models.ForeignKey(Loja, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    @property
    def primeiro_nome(self):
        return self.nome.split()[0]


class Compra(models.Model):
    """Uma venda identificada por CPF. Depois de criada, nunca é editada."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="compras")
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="compras")
    data = models.DateTimeField(db_index=True)
    valor_bruto = models.DecimalField(max_digits=10, decimal_places=2)
    pontos_resgatados = models.PositiveIntegerField(default=0)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valor_pago = models.DecimalField(max_digits=10, decimal_places=2)
    nivel_na_compra = models.CharField(max_length=10, choices=Nivel.choices)
    pontos_ganhos = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-data"]

    def __str__(self):
        return f"{self.cliente} em {self.data:%d/%m/%Y} (R$ {self.valor_pago})"


class MovimentoPontos(models.Model):
    """
    Livro-razão de pontos.
      ACUMULO   -> pontos positivos, gerados por uma compra. É um "lote" com validade.
      RESGATE   -> pontos negativos, usados como desconto numa compra.
      EXPIRACAO -> pontos negativos, o que sobrou de um lote vencido.

    O campo `restante` só vale para ACUMULO: quanto daquele lote ainda não foi
    resgatado nem expirou. É ele que permite o resgate FIFO e a expiração por lote.
    Invariante (testado): soma de `pontos` == soma de `restante` dos lotes.
    """

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
