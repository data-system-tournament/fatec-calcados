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
npm test         # vitest run (pure logic: regras.ts, format, csv)
```

- UI: http://localhost:5173/ (`/pdv`, `/dashboard`, `/clientes`, `/vendas`, `/acoes`) · Admin: http://localhost:8000/admin/
- The frontend container keeps `node_modules` in the named volume `frontend_node_modules`, which `--build` does not refresh. The compose `command` handles this: on start it compares `package-lock.json` with `node_modules/.lock-instalado` and runs `npm ci` only when they differ. After changing dependencies, `docker compose restart frontend` is enough. It stays inline in the compose file (not a `.sh`) because `core.autocrlf=true` would give a script CRLF line endings.
- Never run `docker compose down -v`: it deletes the `db_data` volume.
- The frontend tests (Vitest) cover pure logic only (`regras.ts`, `utils/`). There are no component tests.
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

## Frontend architecture (`frontend/src/`)

- React Router (`routes/index.tsx`, `createBrowserRouter`). `/` is the public landing page (`pages/inicio/Landing.tsx`, fixed black/gray palette scoped by `.landing` in `index.css`, outside the theme tokens; its rule numbers are copied from `regras.py`, so update it with them). The app screens sit under `layouts/MainLayout.tsx`, which renders the sidebar (`components/layout/Sidebar.tsx`, routes listed once in `navegacao.ts`), a header with the collapse button and the `<Outlet />`; Ctrl/⌘ K opens `SearchPalette` (screens + client search). Pages live in `pages/<area>/`. Everything is TypeScript (strict): pages and components are `.tsx`, hooks and services `.ts`.
- Pages unmount when you leave their route, so cross-page state lives in providers mounted by `MainLayout` (`contexts/`). Each context is split into a `.ts` file (context + hook) and a `*Provider.tsx` file, so the component files only export components (oxlint `only-export-components`).
  - `CaixaProvider` / `useCaixa()`: online flag, the sales queue and the in-progress sale (cart, client, payment, points). The queue is persisted in `localStorage` (`fatec:vendas`) and pending sales are resent on load and on reconnect, which relies on backend idempotency by `id`. A sale is cleared from the context as soon as it is recorded, so a finished cart can't come back.
  - `AcoesProvider` / `useAcoes()`: action lists and which ones were marked as done (the nav badge uses it).
  - `ToastProvider` / `useToast()`: `notify(message)`.
- The dashboard period lives in the URL (`?inicio=&fim=`), and so do the filters and page of the Clientes and Vendas lists. The Dashboard keeps its `PeriodFilter` and CSV export button in a bar at the top of the page body (like the filters of Clientes and Vendas), not in the site header, and is organized in sections (Pontos, Vendas, Clientes). Its colors have fixed meanings (`pages/dashboard/tons.ts`): blue = points earned, green = redeemed, amber = cost/expiring, red = expired, violet = client base, cyan = sales; levels use bronze/prata/ouro (`components/ui/corDoNivel.ts`).
- First-visit guided tour: `MainLayout` opens `TourGuiado` (`components/layout/`, steps in `passosTour.ts`, state in `hooks/useTour.ts`) on the first visit to any app screen. It highlights each sidebar item (found by its `data-tour` attribute) and opens the mobile drawer by itself. Finishing or skipping saves `fatec:tour` in `localStorage`; the sidebar button "Rever o tour" reopens it. When a sidebar item or screen changes, update `passosTour.ts`.
- Screen logic lives in `hooks/`: `useCarrinho` (cart and totals), `useFilaVendas` (offline queue), `useAtalhosPdv` (F2/F10), `useAtalhoBusca` (Ctrl/⌘ K), `useSidebar` (open/closed, saved in `fatec:sidebar`) and `useCarregar` (loads from the API with loading/error/retry; `useDashboard` and the list screens use it). Pages only compose.
- `regras.ts` mirrors the point rules of `regras.py` (100 points = R$ 5,00, tier bonus) for the POS previews only; the backend is the source of truth. Change both together, with a test in `regras.test.ts`.
- Styling is Tailwind v4 (`@tailwindcss/vite`). Theme colors are CSS variables in `index.css` mapped with `@theme inline`, so `bg-surface`/`text-ink`/`border-line` switch to dark mode by themselves. Don't add `dark:` classes. Shared pieces are in `components/ui/` (`Button`, `Card`, `LevelBadge`, `Modal`, `Kbd`, `Pill`, `Led`, and form classes in `styles.ts`). To vary a style, pick between whole class strings (see the `variant`/`tone` props) instead of appending a conflicting utility, because Tailwind doesn't guarantee which of two conflicting classes wins.
- `services/api.ts` is the only place that calls the API. It maps the Portuguese API field names to the English names used in components (`nome` → `name`, `saldo_pontos` → `points`, …). Add new endpoints there with a mapper.
- Vite proxies `/api` to `API_URL` (`http://backend:8000` in Docker, `http://127.0.0.1:8000` otherwise, because on Windows `localhost` resolves to IPv6 and hangs through Docker Desktop).
- `config.ts` sets which register this POS is (`REGISTER_CODE`).

## Conventions

- Code written with AI help is marked with a `# Feito com IA: ...` / `// Feito com IA: ...` comment that explains the why (see `docs/onde-usamos-ia.pdf`). Keep this convention on AI-authored logic.
- Every rule in `regras.py`/`services.py` has a matching test. Keep that one-to-one coverage when rules change.
