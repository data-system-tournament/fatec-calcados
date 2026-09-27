# Comandos do projeto

Tudo roda pelo Docker Compose, a partir da pasta raiz do projeto (onde fica o `docker-compose.yml`).
Os comandos do Django são `docker compose exec backend python manage.py <comando>`.

> **Nunca use `docker compose down -v`.** O `-v` apaga o volume `db_data`, ou seja, o banco inteiro.
> Para parar os containers, use só `docker compose down` (ou `docker compose stop`).

## 1. Subir o projeto

```bash
docker compose up -d --build                                  # sobe banco, backend e frontend
docker compose exec backend python manage.py migrate          # cria/atualiza as tabelas
docker compose exec backend python manage.py popular_dados    # dados de exemplo (veja a seção 3)
```

| Endereço | O que é |
|---|---|
| http://localhost:5173/ | Página inicial (landing) |
| http://localhost:5173/login | Entrada do **cliente** (CPF + senha) |
| http://localhost:5173/cadastro | Cliente cria a própria senha |
| http://localhost:5173/admin/entrar | Entrada da **equipe da loja** (PDV, dashboard, estoque...) |
| http://localhost:8000/admin/ | Admin do Django (retaguarda; usa o mesmo login da equipe) |

Depois de mudar dependências:

- **Frontend** (`package.json`): `docker compose restart frontend` (o container reinstala sozinho).
- **Backend** (`requirements.txt`): `docker compose up -d --build backend`.

## 2. Criar usuários

### Gerente / equipe da loja: `criar_admin`

Cria um usuário da equipe, que entra em `/admin/entrar` (caixa, dashboard, clientes, vendas, ações,
avaliações e estoque) e também no admin do Django.

```bash
docker compose exec backend python manage.py criar_admin --usuario gerente --nome "Paula Lima"
```

- Sem `--senha`, o comando pergunta a senha duas vezes sem mostrar na tela (ela não fica no histórico
  do terminal). Em script: `--senha "Calcados#2026"`.
- O usuário **não pode ser só números** (números são CPF, o login dos clientes).
- A senha passa pelas regras do Django: pelo menos 8 caracteres, não pode ser comum nem só números.
- Para **trocar a senha** de quem já existe: acrescente `--redefinir`.

```bash
docker compose exec backend python manage.py criar_admin --usuario gerente --redefinir
```

### Cliente da loja online: `criar_cliente`

Cria o login (CPF + senha) de um cliente, o mesmo que a tela `/cadastro` faz. Depois ele entra em `/login`.

```bash
docker compose exec backend python manage.py criar_cliente --cpf 390.533.447-05 --nome "João Lima" --numeracao 41
```

- `--cpf` precisa ser um CPF válido (com ou sem pontos).
- **CPF novo** vira cliente da "Loja Online". **CPF que já compra no caixa** (por exemplo, um cliente do
  `popular_dados`) só ganha o login se o **primeiro nome** bater com o cadastro. Os CPFs do seed aparecem
  na tela Clientes (mascarados) e completos no admin do Django.
- `--numeracao` (opcional) já grava o número do calçado no perfil: a página do produto marca esse número
  e mostra se ele tem em estoque.
- Sem `--senha`, pergunta a senha duas vezes (mesmas regras de senha da equipe).
- CPF que já tem login é recusado. Para trocar a senha de um cliente, use o admin do Django ou a própria
  área do cliente.

### Pelas telas

- Cliente: http://localhost:5173/cadastro (mesmas regras do `criar_cliente`).
- Equipe: não tem tela de cadastro; só o `criar_admin`.

## 3. Dados de exemplo e manutenção

### `popular_dados`: apaga tudo e gera dados de exemplo

```bash
docker compose exec backend python manage.py popular_dados
docker compose exec backend python manage.py popular_dados --clientes 60 --compras 800 --meses 24 --semente 7
```

- **Apaga** lojas, caixas, produtos, clientes (e os logins deles), vendas, pontos e avaliações, e gera tudo
  de novo. Os usuários da **equipe** (`criar_admin`) ficam.
- Cada venda passa pelas mesmas regras do caixa (`registrar_venda`), então pontos, níveis e dashboard batem.
- Gera também avaliações de produtos (que rendem pontos, como no site) e o estoque por numeração, com
  alguns números zerados e alguns acabando.
- A mesma `--semente` gera sempre os mesmos dados. Opções: `--clientes` (40), `--compras` (420),
  `--sem-cpf` (1/4 das compras), `--meses` (18), `--semente` (2026).
- Depois dele, os clientes não têm login: crie um com `criar_cliente` (seção 2).

### `expirar_pontos`: vence os lotes de pontos com mais de 12 meses

```bash
docker compose exec backend python manage.py expirar_pontos
```

As telas já calculam o saldo só com os lotes válidos; este comando grava as expirações no extrato.

## 4. Testes e verificação

```bash
# Backend (Django)
docker compose exec backend python manage.py test
docker compose exec backend python manage.py test src.tests.test_estoque
docker compose exec backend python manage.py test src.tests.test_regras.RegrasPurasTest.test_prata_bonus_de_10_porcento

# Frontend (rodar dentro de frontend/)
npm run lint     # oxlint
npm run build    # confere os tipos (tsc) e gera o build
npm test         # vitest
```

## 5. Problemas comuns

| Sintoma | O que fazer |
|---|---|
| O navegador pede um arquivo que foi renomeado (erro 404) | `docker compose restart frontend` |
| Mudou o `requirements.txt` e o backend não sobe | `docker compose up -d --build backend` |
| Tabela ou coluna não existe | `docker compose exec backend python manage.py migrate` |
| Entrou como equipe e o cliente saiu (ou o contrário) | Normal: os dois usam a mesma sessão; use outra janela anônima para cada um |
