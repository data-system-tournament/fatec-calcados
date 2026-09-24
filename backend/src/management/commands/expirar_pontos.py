from django.core.management.base import BaseCommand
from django.utils import timezone

from src import services
from src.models import Cliente


class Command(BaseCommand):
    help = "Expira os lotes de pontos vencidos de todos os clientes."

    def handle(self, *args, **opts):
        agora = timezone.now()
        total = sum(services.expirar_pontos(c, agora) for c in Cliente.objects.all())
        self.stdout.write(self.style.SUCCESS(f"{total} pontos expirados."))
