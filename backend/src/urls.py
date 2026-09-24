from django.urls import path

from . import views

urlpatterns = [
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/clientes/<str:cpf>/", views.api_cliente, name="api_cliente"),
    path("api/compras/", views.api_compras, name="api_compras"),
]
