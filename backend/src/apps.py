from django.apps import AppConfig


class ProgramaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'src'
    # Mantém o label antigo para não mudar as tabelas do banco nem as migrations.
    label = 'programa'
