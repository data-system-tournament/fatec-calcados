# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

FATECalçados loyalty program (Desafio de Inovação Data System 2026): a Django + PostgreSQL backend and a React + Vite frontend with five tabs: PDV/Caixa (point of sale), Dashboard, Clientes, Vendas and Ações. Code, identifiers, API fields, commit messages and docs are in Brazilian Portuguese. Follow that convention.

## Commands

Everything runs through Docker Compose from the repo root:

```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py popular_dados       # deterministic seed; --clientes/--compras/--meses/--semente
docker compose exec backend python manage.py expirar_pontos      # expire overdue point lots
docker compose exec backend python manage.py createsuperuser     # for /admin

# Backend tests (Django TestCase, in backend/src/tests/)
docker compose exec backend python manage.py test
docker compose exec backend python manage.py test src.tests.test_regras
docker compose exec backend python manage.py test src.tests.test_regras.RegrasPurasTest.test_prata_bonus_de_10_porcento

# Frontend (run in frontend/)
npm run lint     # oxlint
npm run build    # tsc -b && vite build
npm test         # vitest run (pure logic: regras.ts, utils/format, utils/cpf, dashboard csv)
```

- UI: http://localhost:5173/ (`/pdv`, `/dashboard`, `/clientes`, `/vendas`, `/acoes`; client area: `/login`, `/cadastro`, `/loja`, `/minha-conta`) · Admin: http://localhost:8000/admin/
- The frontend container keeps `node_modules` in the named volume `frontend_node_modules`, which `--build` does not refresh. The compose `command` handles this: on start it compares `package-lock.json` with `node_modules/.lock-instalado` and runs `npm ci` only when they differ. After changing dependencies, `docker compose restart frontend` is enough. It stays inline in the compose file (not a `.sh`) because `core.autocrlf=true` would give a script CRLF line endings.
- Never run `docker compose down -v`: it deletes the `db_data` volume.
- The frontend tests (Vitest) cover pure logic only (`regras.ts`, `utils/`, `pages/dashboard/csv.ts`). There are no component tests.
- The Vite dev server in Docker does not see deleted or renamed files: after renaming a module (`x.js` → `x.ts`), `touch` the files that import it or run `docker compose restart frontend`, or the browser keeps requesting the old name (404).

## Backend architecture (`backend/src/`, a single Django app)

The layers are strict, and each one only calls the layer below it:

- `regras.py`: every number from the program rules (tiers, bonus %, 100-point redemption blocks worth R$ 5,00, 12-month validity) as pure functions with no DB access. A rule change starts here.
- `services.py`: the only place where rules touch the DB (`registrar_venda` → `registrar_compra`, `expirar_pontos`, `saldo`, `nivel_atual`, `cadastrar_cliente`). Business violations raise `RegraViolada`, and views turn it into a 400 with `{"erro": ...}`.
- `indicadores.py` (dashboard queries), `acoes.py` (manager action lists) and `consultas.py` (client/sale lists, client profile, sale detail) are read-only. They never write, not even point expirations: `consultas.py` computes the balance from the still-valid lots instead of calling `expirar_pontos`.
- `views.py`: plain Django function views returning JSON under `/api/...`. `/api/clientes/` and `/api/vendas/` serve both GET (list) and POST (register). Customer CPFs are always masked (`cpf.mascarar`) in lists, ranking and profile; clients are identified there by `id` (`/api/clientes/<id>/perfil/`). They parse input and call services/indicadores. No business logic goes here.

Key invariants:
- **Points are a ledger.** `MovimentoPontos` rows (accrual, redemption, expiration) are the source of truth. The balance is always their sum, and there is no stored `saldo` field. Each purchase creates a lot that expires after 12 months, and redemption consumes lots FIFO (`_consumir_lotes`).
- The tier comes from points **accrued over the last 12 months**, not from the balance. The bonus uses the tier from *before* the purchase. Points are computed on the amount paid after the discount, with cents dropped.
- The seed (`popular_dados`) creates sales and pushes each one through the same `registrar_venda` that the POS uses, in chronological order. It never writes points directly, and it must stay that way so the dashboard numbers match the rules (checked in `tests/test_telas.py`).
- `POST /api/vendas/` is idempotent on the client-generated UUID `id`: a resend returns 200 with the existing sale. Prices always come from the DB. The client sends only `sku` and quantity. `data` may come from the register for offline sales.
- Registers are identified by `Caixa.codigo` (for example `araras-01`).
- Admin views for `Compra` and `MovimentoPontos` are read-only (`SomenteLeitura`).
- **Client area (`/api/conta/`)**: login is CPF + password, no e-mail. `Cliente.usuario` is a OneToOne to a Django `User` whose username is the CPF (it only holds the password hash). `services.criar_acesso` creates the `Cliente` for a new CPF (store "Loja Online") or links an existing one only if the first name matches. Online purchases go through `services.comprar_online` → the same `registrar_venda`, on the register `online-01` (`caixa_online()` creates it lazily because the seed wipes stores); the CPF always comes from the session, never from the body. These views use the session cookie, so unlike the store routes they are **not** `csrf_exempt`: the front sends `X-CSRFToken` and `CSRF_TRUSTED_ORIGINS` lists the Vite origins. The account data is `consultas.painel_do_cliente` (read-only); `services.alterar_senha` (`POST /api/conta/senha/`) needs the current password and keeps the session; the frontend has no screen for it for now (`/minha-conta/dados` is read-only). The seed deletes client users with the clients.

## Frontend architecture (`frontend/src/`)

- React Router (`routes/index.tsx`, `createBrowserRouter`). `/` is the public landing page (`pages/inicio/Landing.tsx`, fixed palette from the logo `public/fatec-icon.svg` (vinho `#8F0D0D`, cinza `#B7B7B7`) scoped by `.landing` in `index.css`, outside the theme tokens; its rule numbers are copied from `regras.py`, so update it with them). Its hero (`VitrineTenis.tsx`, state in `hooks/useVitrine.ts`) rotates Unsplash sneaker photos listed in `pages/inicio/fotos.ts`; each entry carries the photo's studio background color, which the hero paints behind it. The access screens `/login` and `/cadastro` (`TelaAcesso`, classes `.landing .landing-acesso`) use role tokens (`--l-fundo`, `--l-texto`, `--l-linha`…) that get a light version under `.landing-acesso` following the same `data-theme`/`fatec:tema` choice (toggle `pages/inicio/BotaoTema.tsx`); the landing itself stays fixed. The app screens sit under `layouts/MainLayout.tsx`, which renders the sidebar (`components/layout/Sidebar.tsx`, routes listed once in `navegacao.ts`), a header with the collapse button and the `<Outlet />`; Ctrl/⌘ K opens `SearchPalette` (screens + client search). Pages live in `pages/<area>/`. Everything is TypeScript (strict): pages and components are `.tsx`, hooks and services `.ts`.
- Pages unmount when you leave their route, so cross-page state lives in providers mounted by `MainLayout` (`contexts/`). Each context is split into a `.ts` file (context + hook) and a `*Provider.tsx` file, so the component files only export components (oxlint `only-export-components`).
  - `CaixaProvider` / `useCaixa()`: online flag, the sales queue and the in-progress sale (cart, client, payment, points). The queue is persisted in `localStorage` (`fatec:vendas`) and pending sales are resent on load and on reconnect, which relies on backend idempotency by `id`. A sale is cleared from the context as soon as it is recorded, so a finished cart can't come back.
  - `AcoesProvider` / `useAcoes()`: action lists and which ones were marked as done (the nav badge uses it).
  - `ToastProvider` / `useToast()`: `notify(message)`.
- Client area, organized like online stores (Mercado Livre, Shopee): `/login` and `/cadastro` (`pages/inicio/`, shared frame `TelaAcesso`) sign the client in and land on `/loja` (products). `layouts/ClienteLayout.tsx` (no session → `/login`) renders the same `Sidebar` and header as `MainLayout` with `GRUPOS_CLIENTE` from `navegacao.ts`: "Loja online" (`/loja`, `/loja/carrinho`) and "Minha conta" (`/minha-conta` resumo, `/compras`, `/pontos`, `/dados`). Pages are in `pages/conta/` (`Loja` reuses `pdv/ProductGrid`; shared pieces in `pecas.tsx`). The `Sidebar` is configured by props (`grupos`, `subtitulo`, `avisoDaRota` for badges, `status` for the footer block; search, tour and `onSair` only show when passed), so store-only state (`useCaixa`/`useAcoes`) stays in `MainLayout`. State lives in `ContaProvider` / `useConta()` (session + online cart in `fatec:carrinho-online`); totals in `hooks/useCarrinhoOnline.ts`. `MeusPontos` copies the level table from `regras.py`. `SaleDetailModal` takes `doCliente` to load from `/api/conta/compras/<id>/`. Store staff reach the app through "Área da loja" on the landing (no staff login yet).
- The dashboard period lives in the URL (`?inicio=&fim=`), and so do the filters and page of the Clientes and Vendas lists. The Dashboard keeps its `PeriodFilter` and the CSV/PDF export buttons in a bar at the top of the page body (like the filters of Clientes and Vendas), not in the site header, and is organized in sections (Pontos, Vendas, Clientes). Its colors have fixed meanings (`pages/dashboard/tons.ts`): blue = points earned, green = redeemed, amber = cost/expiring, red = expired, violet = client base, cyan = sales; levels use bronze/prata/ouro (`components/ui/corDoNivel.ts`). "Exportar PDF" is just `window.print()` (`exportPdf.ts`): the paper layout is the `@media print` block at the end of `index.css` plus `print:` classes (sidebar, header and filter bar get `print:hidden`), and `useTemaClaroAoImprimir` forces the light theme while printing.
- First-visit guided tour: `MainLayout` opens `TourGuiado` (`components/layout/`, steps in `passosTour.ts`, state in `hooks/useTour.ts`) on the first visit to any app screen. It highlights each sidebar item (found by its `data-tour` attribute) and opens the mobile drawer by itself. Finishing or skipping saves `fatec:tour` in `localStorage`; the sidebar button "Rever o tour" reopens it. When a sidebar item or screen changes, update `passosTour.ts`.
- Screen logic lives in `hooks/`: `useCarrinho` (cart and totals), `useFilaVendas` (offline queue), `useAtalhosPdv` (F2/F10), `useAtalhoBusca` (Ctrl/⌘ K), `useSidebar` (open/closed, saved in `fatec:sidebar`) and `useCarregar` (loads from the API with loading/error/retry; `useDashboard` and the list screens use it). Pages only compose.
- `utils/` holds only pure functions used in 2+ places: `format.ts` (money, numbers, dates, `plural`, `normalizeText`) and `cpf.ts` (mask and validation, mirroring the backend `cpf.py`). A helper used by a single screen lives next to it (e.g. `pages/dashboard/csv.ts`, `todayLabel` in `MainLayout`); move it to `utils/` when a second place needs it.
- `regras.ts` mirrors the point rules of `regras.py` (100 points = R$ 5,00, tier bonus) for the POS previews only; the backend is the source of truth. Change both together, with a test in `regras.test.ts`.
- Styling is Tailwind v4 (`@tailwindcss/vite`). Theme colors are CSS variables in `index.css` mapped with `@theme inline`, so `bg-surface`/`text-ink`/`border-line` switch to dark mode by themselves. Don't add `dark:` classes. The theme follows the system unless the user picks light/dark in the "Aparência e acessibilidade" panel (`components/layout/PainelAcessibilidade.tsx`, the single sidebar entry for theme, font size and accessibility options; theme logic in `hooks/useTema.ts`, saved in `fatec:tema`), which sets `data-theme` on `<html>`; an inline script in `index.html` applies it before the first paint. Each sidebar screen has its own color (`cor` in `navegacao.ts`). Besides the dashboard tones there are `rosa`, `laranja` and `esmeralda` tokens. Shared pieces are in `components/ui/` (`Button`, `Card`, `LevelBadge`, `Modal`, `Kbd`, `Pill`, `Led`, and form classes in `styles.ts`). To vary a style, pick between whole class strings (see the `variant`/`tone` props) instead of appending a conflicting utility, because Tailwind doesn't guarantee which of two conflicting classes wins.
- `services/api/` is the only place that calls the API. `http.ts` holds `request` (CSRF, errors as `ApiError`), `errorMessage` and `queryString`; there is one module per area (`produtos`, `clientes`, `vendas`, `acoes`, `dashboard`, `conta`), each mapping the Portuguese API field names to the English names used in components (`nome` → `name`, `saldo_pontos` → `points`, …). Pages import from `services/api` (`index.ts`), which re-exports only the fetch functions, not the mappers. Add new endpoints to the module of their area with a mapper and export them in `index.ts`.
- Vite proxies `/api` to `API_URL` (`http://backend:8000` in Docker, `http://127.0.0.1:8000` otherwise, because on Windows `localhost` resolves to IPv6 and hangs through Docker Desktop).
- `config.ts` sets which register this POS is (`REGISTER_CODE`).

## Conventions

- Code written with AI help is marked with a `# Feito com IA: ...` / `// Feito com IA: ...` comment that explains the why (see `docs/onde-usamos-ia.pdf`). Keep this convention on AI-authored logic.
- Every rule in `regras.py`/`services.py` has a matching test. Keep that one-to-one coverage when rules change.
