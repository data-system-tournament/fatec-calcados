from django.urls import path

from . import views

urlpatterns = [
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/acoes/", views.api_acoes, name="api_acoes"),
    path("api/produtos/", views.api_produtos, name="api_produtos"),
    path("api/produtos/<str:sku>/", views.api_produto_detalhe, name="api_produto_detalhe"),
    path("api/clientes/", views.api_clientes, name="api_clientes"),
    path("api/clientes/<int:cliente_id>/perfil/", views.api_cliente_perfil, name="api_cliente_perfil"),
    path("api/clientes/<str:cpf>/", views.api_cliente, name="api_cliente"),
    path("api/vendas/", views.api_vendas, name="api_vendas"),
    path("api/avaliacoes/", views.api_avaliacoes, name="api_avaliacoes"),
    path("api/vendas/<uuid:compra_id>/", views.api_venda_detalhe, name="api_venda_detalhe"),
    path("api/estoque/", views.api_estoque, name="api_estoque"),
    path("api/estoque/<str:sku>/", views.api_estoque_produto, name="api_estoque_produto"),
    path("api/equipe/", views.api_equipe, name="api_equipe"),
    path("api/equipe/entrar/", views.api_equipe_entrar, name="api_equipe_entrar"),
    path("api/equipe/sair/", views.api_equipe_sair, name="api_equipe_sair"),
    path("api/conta/", views.api_conta, name="api_conta"),
    path("api/conta/cadastro/", views.api_conta_cadastro, name="api_conta_cadastro"),
    path("api/conta/entrar/", views.api_conta_entrar, name="api_conta_entrar"),
    path("api/conta/sair/", views.api_conta_sair, name="api_conta_sair"),
    path("api/conta/senha/", views.api_conta_senha, name="api_conta_senha"),
    path("api/conta/excluir/", views.api_conta_excluir, name="api_conta_excluir"),
    path("api/conta/perfil/", views.api_conta_perfil, name="api_conta_perfil"),
    path("api/conta/compras/", views.api_conta_compras, name="api_conta_compras"),
    path("api/conta/compras/<uuid:compra_id>/", views.api_conta_compra_detalhe, name="api_conta_compra_detalhe"),
    path("api/conta/avaliacoes/", views.api_conta_avaliacoes, name="api_conta_avaliacoes"),
]
