import json
import re

from django.test import TestCase
from django.urls import URLPattern

from src import urls, views

ESPEC = json.loads(views.ARQUIVO_OPENAPI.read_text(encoding="utf-8"))
ROTAS_DA_DOCUMENTACAO = {"api_openapi", "api_docs"}
EXEMPLO_DO_PARAMETRO = {"int": "1", "str": "x", "uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7"}


def _rotas():
    """(caminho no OpenAPI, caminho de exemplo) de cada rota de urls.py, menos as da própria documentação."""
    for padrao in urls.urlpatterns:
        if not isinstance(padrao, URLPattern) or padrao.name in ROTAS_DA_DOCUMENTACAO:
            continue
        rota = "/" + str(padrao.pattern)
        yield (
            re.sub(r"<\w+:(\w+)>", r"{\1}", rota),
            re.sub(r"<(\w+):\w+>", lambda m: EXEMPLO_DO_PARAMETRO[m.group(1)], rota),
        )


def _refs(no):
    if isinstance(no, dict):
        for chave, valor in no.items():
            if chave == "$ref":
                yield valor
            else:
                yield from _refs(valor)
    elif isinstance(no, list):
        for item in no:
            yield from _refs(item)


# Feito com IA: a especificação é escrita à mão, então estes testes impedem que ela fique para trás:
# toda rota de urls.py está documentada, com exatamente os métodos que a view aceita (os outros dão 405).
class OpenApiTest(TestCase):
    def test_toda_rota_esta_documentada(self):
        documentadas = set(ESPEC["paths"])
        rotas = {caminho for caminho, _ in _rotas()}
        self.assertEqual(rotas - documentadas, set(), "rotas sem documentação")
        self.assertEqual(documentadas - rotas, set(), "documentação de rota que não existe")

    def test_metodos_documentados_sao_os_aceitos(self):
        for caminho, exemplo in _rotas():
            documentados = set(ESPEC["paths"][caminho])
            for metodo in ("get", "post"):
                with self.subTest(caminho=caminho, metodo=metodo):
                    resposta = getattr(self.client, metodo)(exemplo, content_type="application/json")
                    self.assertEqual(resposta.status_code == 405, metodo not in documentados)

    def test_referencias_existem(self):
        for ref in set(_refs(ESPEC)):
            with self.subTest(ref=ref):
                no = ESPEC
                for parte in ref.removeprefix("#/").split("/"):
                    self.assertIn(parte, no)
                    no = no[parte]

    def test_swagger_e_especificacao_sao_servidos(self):
        self.assertEqual(self.client.get("/api/openapi.json").json()["openapi"], "3.1.0")
        resposta = self.client.get("/api/docs/")
        self.assertContains(resposta, "swagger-ui")
        self.assertIn("csrftoken", resposta.cookies)
