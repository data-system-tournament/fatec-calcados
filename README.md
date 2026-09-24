# FATECalçados · Programa de Fidelidade

Desafio de Inovação Data System 2026.

- **Caixa (PDV)**: identifica o cliente pelo CPF, registra a venda, acumula e resgata pontos.
- **Dashboard gerencial**: base do programa, pontos acumulados vs. resgatados, custo, ranking e evolução no tempo.

| Pasta | O que é |
|---|---|
| [`backend/`](backend/) | Django + PostgreSQL: regras do programa, API e admin. Veja o [README do backend](backend/README.md). |
| [`frontend/`](frontend/) | React + Vite: telas do caixa e do dashboard. Veja o [README do frontend](frontend/README.md). |

## Como rodar

```bash
docker compose up -d --build

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py popular_dados      # dados de exemplo
docker compose exec backend python manage.py createsuperuser    # login do /admin
```

- Telas (caixa e dashboard): http://localhost:5173/
- Admin (retaguarda): http://localhost:8000/admin/

Testes: `docker compose exec backend python manage.py test`
