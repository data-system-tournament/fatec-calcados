from django.urls import path

from . import views

urlpatterns = [
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/acoes/", views.api_acoes, name="api_acoes"),
    path("api/produtos/", views.api_produtos, name="api_produtos"),
    path("api/clientes/", views.api_cadastrar_cliente, name="api_cadastrar_cliente"),
    path("api/clientes/<str:cpf>/", views.api_cliente, name="api_cliente"),
    path("api/vendas/", views.api_vendas, name="api_vendas"),
]
