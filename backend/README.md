# Programa de fidelidade da FATECalçados

Desafio de Inovação Data System 2026. Backend em Django + PostgreSQL; as telas ficam no React (`../frontend`). Tudo roda via Docker Compose.

- **Dashboard gerencial (React)**: `http://127.0.0.1:5173/`
- **Retaguarda (Django Admin)**: `http://127.0.0.1:8000/admin/`
- **API do dashboard**: `/api/dashboard/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`
- **API para o PDV**: `/api/clientes/<cpf>/` e `/api/compras/`

## Como rodar (Docker)

Na raiz do repositório (onde está o `docker-compose.yml`):

```bash
docker compose up -d --build

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py popular_dados      # 40 clientes, 420 compras, 18 meses de histórico
docker compose exec backend python manage.py test               # 31 testes das regras, telas e API
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
| `src/views.py` | APIs (dashboard e PDV). Só chamam services e indicadores. |
| `src/management/commands/popular_dados.py` | Seed: gera compras e passa cada uma pelo service. |
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
auditado até a compra que o gerou, e que dashboard, página do cliente e API nunca discordam.

## Por que os números do dashboard batem com as regras

O seed não inventa pontos: ele inventa compras (cliente, loja, data, valor) e passa cada uma,
em ordem cronológica, pelo mesmo `registrar_compra` que o PDV usaria. Os testes em
`tests/test_telas.py` conferem, por exemplo, que custo = pontos resgatados × R$ 0,05 e que a
soma do gráfico mensal é igual ao total do período.

## E o PDV?

O PDV (como o USE) conversaria com o programa por dois endpoints:

```bash
# 1. Cliente informa o CPF no caixa: consultar saldo e nível
curl http://127.0.0.1:8000/api/clientes/52998224725/

# 2. Ao finalizar a venda: registrar a compra (com ou sem resgate)
curl -X POST http://127.0.0.1:8000/api/compras/ \
  -H "Content-Type: application/json" \
  -d '{"cpf": "52998224725", "loja_id": 1, "valor": "489.60", "pontos_resgate": 0}'
```

(Troque o CPF por um que exista no seu banco.)

Pontos de evolução para um PDV real: autenticação do caixa por token, e o que fazer quando
o caixa estiver sem internet (acumular pode ficar numa fila e sincronizar depois; resgatar
offline é arriscado, porque o mesmo saldo poderia ser usado em duas lojas ao mesmo tempo).

## Roteiro para a equipe entender o projeto antes da banca

1. Leia `regras.py` inteiro (é curto) e explique cada decisão com as suas palavras.
2. Leia `registrar_compra` em `services.py` e siga a ordem dos passos.
3. Mude o bônus de Prata para 15% em `regras.py` e rode `docker compose exec backend python manage.py test`: veja qual teste quebra e por quê. Depois desfaça.
4. No `/admin`, abra um cliente, veja as compras e os movimentos, e confira na mão os pontos de uma compra.
5. Pela API (`/api/clientes/<cpf>/`), confira que o saldo e o nível batem com o ranking do dashboard.
