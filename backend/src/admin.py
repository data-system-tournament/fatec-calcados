"""
Admin do Django, usado como "retaguarda" para cadastrar lojas e clientes.
Compras e movimentos são SÓ LEITURA aqui: eles só podem nascer pelo service
(registrar_compra), senão as regras seriam furadas.
"""
from django import forms
from django.contrib import admin

from . import cpf as cpf_utils
from . import services
from .models import Cliente, Compra, Loja, MovimentoPontos


@admin.register(Loja)
class LojaAdmin(admin.ModelAdmin):
    list_display = ("nome", "cidade")


class ClienteForm(forms.ModelForm):
    class Meta:
        model = Cliente
        fields = "__all__"

    def clean_cpf(self):
        numero = cpf_utils.limpar(self.cleaned_data["cpf"])
        if not cpf_utils.validar(numero):
            raise forms.ValidationError("CPF inválido. Confira os números.")
        return numero


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    form = ClienteForm
    list_display = ("nome", "cpf_formatado", "loja_cadastro", "cadastrado_em", "nivel", "saldo")
    search_fields = ("nome", "cpf")
    list_filter = ("loja_cadastro",)

    @admin.display(description="CPF")
    def cpf_formatado(self, obj):
        return cpf_utils.formatar(obj.cpf)

    @admin.display(description="Nível")
    def nivel(self, obj):
        return services.nivel_atual(obj)

    @admin.display(description="Saldo")
    def saldo(self, obj):
        return services.saldo(obj)


class SomenteLeitura(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Compra)
class CompraAdmin(SomenteLeitura):
    list_display = ("data", "cliente", "loja", "valor_bruto", "pontos_resgatados", "valor_pago", "nivel_na_compra", "pontos_ganhos")
    list_filter = ("loja", "nivel_na_compra")
    search_fields = ("cliente__nome", "cliente__cpf")
    date_hierarchy = "data"


@admin.register(MovimentoPontos)
class MovimentoPontosAdmin(SomenteLeitura):
    list_display = ("data", "cliente", "tipo", "pontos", "restante", "expira_em")
    list_filter = ("tipo",)
    search_fields = ("cliente__nome", "cliente__cpf")
    date_hierarchy = "data"
