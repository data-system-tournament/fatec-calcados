# Programa de fidelidade da FATECalçados

Desafio de Inovação Data System 2026. Backend em Django + PostgreSQL; as telas ficam no React (`../frontend`). Tudo roda via Docker Compose.

- **Dashboard gerencial (React)**: `http://127.0.0.1:5173/`
- **Retaguarda (Django Admin)**: `http://127.0.0.1:8000/admin/`
- **API do dashboard**: `/api/dashboard/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`
- **API das ações do gestor**: `/api/acoes/` (clientes sumindo, pontos vencendo, perto de subir de nível, novos sem segunda compra)
- **API do caixa (PDV)**: produtos, clientes e vendas (veja "E o PDV?")

## Como rodar (Docker)

Na raiz do repositório (onde está o `docker-compose.yml`):

```bash
docker compose up -d --build

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py popular_dados      # 40 clientes, 16 produtos, ~525 vendas, 18 meses de histórico
docker compose exec backend python manage.py test               # 68 testes das regras, telas e API
docker compose exec backend python manage.py createsuperuser    # para entrar no /admin
```

O frontend sobe com `--host 0.0.0.0`, então as telas podem ser abertas no celular
durante a apresentação (mesma rede Wi-Fi): `http://IP-DO-NOTEBOOK:5173/`
(descubra o IP com: `hostname -I`).

Pegue um CPF para demonstrar no `/admin` (Clientes) ou rode:

```bash
docker compose exec backend python manage.py shell -c "from src.models import Cliente; [print(c.cpf, c.nome) for c in Cliente.objects.all()[:5]]"
```

O seed é determinístico: a mesma `--semente` gera sempre os mesmos dados.
Opções: `docker compose exec backend python manage.py popular_dados --clientes 60 --compras 800 --meses 24 --semente 7`.

## Onde está cada coisa

| Arquivo | O que faz |
|---|---|
| `src/regras.py` | Todos os números do regulamento e as decisões da equipe. Funções puras, sem banco. |
| `src/models.py` | Loja, Cliente, Compra e MovimentoPontos (o livro-razão de pontos). |
| `src/services.py` | `registrar_compra`, `expirar_pontos`, `saldo`, `nivel_atual`. **Toda regra é aplicada aqui.** |
| `src/indicadores.py` | As consultas de cada bloco do dashboard. |
| `src/acoes.py` | As listas da aba Ações: quais clientes o gestor deveria contatar hoje. |
| `src/consultas.py` | Só leitura: lista e perfil de clientes, lista e detalhe de vendas (telas Clientes e Vendas). |
| `src/views.py` | APIs (dashboard, PDV, clientes e vendas). Só chamam services, indicadores e consultas. |
| `src/management/commands/popular_dados.py` | Seed: gera lojas, caixas, produtos e vendas, passando cada venda pelo service. |
| `src/tests/` | Um teste para cada regra. |

## Decisões que o regulamento deixou em aberto

1. **Nível pelos pontos acumulados nos últimos 12 meses**, não pelo saldo. Se fosse pelo saldo, o cliente seria rebaixado por resgatar, o que desincentiva o uso do programa.
2. **O bônus usa o nível de antes da compra.** Mais simples de explicar no caixa e evita que a compra "se bonifique".
3. **Pontos sobre o valor pago**, depois do desconto dos pontos. Senão o desconto geraria pontos.
4. **Centavos descartados**: R$ 489,60 vira 489 pontos-base; Prata: 489 × 1,10 = 537.
5. **Resgate em múltiplos de 100** (a unidade de R$ 5,00), e o desconto não pode passar do valor da compra.
6. **Validade por lote e resgate FIFO**: cada compra gera um lote que vence em 12 meses; o resgate consome os mais antigos primeiro, para o cliente perder o mínimo possível.

## Por que um livro-razão (e não um campo "saldo")

Cada ponto que entra ou sai é uma linha em `MovimentoPontos` (acúmulo, resgate ou expiração).
O saldo é a soma dessas linhas. Isso garante que qualquer número do dashboard pode ser
auditado até a compra que o gerou, e que dashboard, caixa e API nunca discordam.

## Por que os números do dashboard batem com as regras

O seed não inventa pontos: ele inventa vendas (cliente, loja, data, produtos) e passa cada uma,
em ordem cronológica, pelo mesmo `registrar_venda` que o caixa usa. Os testes em
`tests/test_telas.py` conferem, por exemplo, que custo = pontos resgatados × R$ 0,05 e que a
soma do gráfico mensal é igual ao total do período.

## E o PDV?

O caixa (tela "PDV / Caixa" do React) conversa com o programa por estes endpoints.
Cada caixa se identifica por um código (`Caixa.codigo`); o `popular_dados` cria um por loja,
por exemplo `araras-01`.

| Método e rota | Para quê |
|---|---|
| `GET /api/produtos/?busca=tenis` | Catálogo (sem `busca`, devolve todos os ativos) |
| `GET /api/clientes/<cpf>/` | Nome, nível, saldo e pontos que dá para usar |
| `GET /api/clientes/?busca=&nivel=&pagina=` | Lista paginada de clientes (CPF mascarado; `nivel` = `BRONZE`, `PRATA` ou `OURO`) |
| `GET /api/clientes/<id>/perfil/` | Perfil: progresso para o próximo nível, lotes a vencer, compras e extrato de pontos |
| `POST /api/clientes/` | Cadastro rápido no caixa: `{cpf, nome, caixa}` |
| `POST /api/vendas/` | Registra a venda (com ou sem CPF, com ou sem resgate) |
| `GET /api/vendas/?inicio=&fim=&caixa=&pagamento=&pagina=` | Lista paginada de vendas, com o faturamento do filtro |
| `GET /api/vendas/<uuid>/` | Detalhe da venda, com os itens |

```bash
curl -X POST http://127.0.0.1:8000/api/vendas/ \
  -H "Content-Type: application/json" \
  -d '{"id": "3f1c2d4e-0000-4000-8000-000000000001", "caixa": "araras-01", "cpf": "52998224725",
       "itens": [{"sku": "7890001", "quantidade": 1}], "forma_pagamento": "PIX", "pontos_resgate": 0}'
```

(Troque o CPF por um que exista no seu banco.)

Três cuidados na venda:

1. **O preço vem do banco**, nunca da tela: o caixa manda só código e quantidade.
2. **O `id` é gerado no caixa** (UUID). Se a mesma venda chegar duas vezes (caixa que ficou
   offline e reenviou), a segunda resposta é `200` com a venda já registrada, sem duplicar pontos.
3. **A `data` pode vir do caixa**, para a venda feita offline contar no horário em que aconteceu.

Pontos de evolução para um PDV real: autenticação do caixa por token, senha do gerente para
descontos, e resgate offline (é arriscado: o mesmo saldo poderia ser usado em duas lojas ao
mesmo tempo; hoje o resgate de uma venda offline só é validado quando ela sincroniza).

## Roteiro para a equipe entender o projeto antes da banca

1. Leia `regras.py` inteiro (é curto) e explique cada decisão com as suas palavras.
2. Leia `registrar_compra` em `services.py` e siga a ordem dos passos.
3. Mude o bônus de Prata para 15% em `regras.py` e rode `docker compose exec backend python manage.py test`: veja qual teste quebra e por quê. Depois desfaça.
4. No `/admin`, abra um cliente, veja as compras e os movimentos, e confira na mão os pontos de uma compra.
5. Pela API (`/api/clientes/<cpf>/`), confira que o saldo e o nível batem com o ranking do dashboard.
