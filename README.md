# FATECalçados · Programa de Fidelidade

Desafio de Inovação Data System 2026.

- **Caixa (PDV)**: identifica o cliente pelo CPF, registra a venda, acumula e resgata pontos.
- **Dashboard gerencial**: base do programa, pontos acumulados vs. resgatados, custo, ranking, evolução no tempo, vendas por pagamento e caixa, produtos mais vendidos, resgate por nível e passivo de pontos (com exportação em CSV).
- **Clientes e Vendas**: lista de clientes com perfil (progresso de nível, lotes a vencer, extrato) e histórico de vendas com filtros e detalhe.

| Pasta | O que é |
|---|---|
| [`backend/`](backend/) | Django + PostgreSQL: regras do programa, API e admin. Veja o [README do backend](backend/README.md). |
| [`frontend/`](frontend/) | React + Vite + Tailwind: telas do caixa, dashboard, clientes, vendas e ações. Veja o [README do frontend](frontend/README.md). |

## Como rodar

```bash
docker compose up -d --build

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py popular_dados      # dados de exemplo
docker compose exec backend python manage.py createsuperuser    # login do /admin
```

- Telas: http://localhost:5173/pdv (caixa), http://localhost:5173/dashboard e http://localhost:5173/acoes
- Admin (retaguarda): http://localhost:8000/admin/

Testes: `docker compose exec backend python manage.py test`

Depois de instalar uma dependência nova no frontend, basta `docker compose restart frontend`:
o container percebe que o `package-lock.json` mudou e reinstala sozinho.

Cuidado: `docker compose down -v` apaga o volume do banco (`db_data`) junto com os dados.
