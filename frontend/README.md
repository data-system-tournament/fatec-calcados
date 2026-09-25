# Frontend · FATECalçados

React + Vite + Tailwind CSS v4 + React Router. Cinco telas: **PDV / Caixa** (`/pdv`), **Dashboard** (`/dashboard`), **Clientes** (`/clientes` e `/clientes/:id`), **Vendas** (`/vendas`) e **Ações** (`/acoes`). Todos os dados vêm da API do Django.

## Onde está cada coisa

| Arquivo | O que faz |
|---|---|
| `src/App.tsx` + `src/routes/index.tsx` | Rotas. `/` redireciona para `/dashboard`; endereço desconhecido mostra `NotFound` |
| `src/layouts/MainLayout.tsx` | Moldura de todas as telas: topbar, abas e o `<Outlet />` onde a página aparece |
| `src/contexts/` | Estado compartilhado entre as telas (veja abaixo) |
| `src/components/ui/` | Peças visuais reutilizadas: botão, card, badge de nível, modal, toast |
| `src/components/layout/` | Topbar (marca, data, status do caixa) e abas de navegação |
| `src/components/charts/` | Gráfico de pontos por mês (Recharts) |
| `src/pages/pdv/` | Caixa: busca de produto, carrinho, cliente por CPF, resgate de pontos, recibo |
| `src/pages/dashboard/` | Dashboard gerencial, filtro de período e exportação em CSV |
| `src/pages/clientes/` | Lista de clientes (busca e nível) e perfil de cada um |
| `src/pages/vendas/` | Histórico de vendas com filtros e o detalhe de cada venda |
| `src/pages/acoes/` | Ações do gestor: listas de clientes para contatar e mensagem sugerida |
| `src/services/api.ts` | Todas as chamadas à API. Converte os nomes da API (português) para os usados nas telas |
| `src/hooks/` | Lógica das telas: carrinho, fila de vendas, atalhos do PDV e `useCarregar` (loading, erro e tentar de novo) |
| `src/regras.ts` | Espelho de `backend/src/regras.py` para as prévias do PDV (100 pontos = R$ 5,00, bônus do nível) |
| `src/types.ts` | Formato dos dados depois dessa conversão (Produto, Cliente, Venda...) |
| `src/config.ts` | Qual caixa este PDV é (`REGISTER_CODE`) e textos fixos |
| `src/utils/format.ts` | Formatação brasileira: dinheiro, CPF, datas |
| `src/utils/csv.ts` | CSV para abrir no Excel em português (`;` e vírgula decimal) |
| `src/index.css` | Tailwind, cores do tema (claro e escuro) e estilos base |

## Estado compartilhado (`src/contexts/`)

Cada tela só existe enquanto está aberta. O que precisa sobreviver à troca de tela fica nos providers, montados no `MainLayout`:

- **`CaixaProvider`** (`useCaixa()`): conexão do caixa, fila de vendas e a venda em andamento (carrinho, cliente, pagamento, pontos). Trocar de aba no meio de uma venda não perde o carrinho. A fila de vendas é salva no `localStorage` (`fatec:vendas`): um F5 não apaga vendas feitas offline, e as pendentes são enviadas sozinhas ao abrir a página. Reenviar é seguro porque o backend não duplica uma venda com o mesmo `id`.
- **`AcoesProvider`** (`useAcoes()`): listas da aba Ações e quais já foram marcadas como feitas (o contador da aba usa isso).
- **`ToastProvider`** (`useToast()`): `notify("mensagem")` mostra o aviso no rodapé.

O período do Dashboard fica na URL (`/dashboard?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`), então dá para recarregar ou mandar o link sem perder o filtro. Clientes e Vendas fazem o mesmo com busca, filtros e página (`/clientes?busca=ana&nivel=PRATA&pagina=2`).

## Estilo (Tailwind)

As cores são variáveis CSS em `src/index.css` (`--ink`, `--surface`, `--line`...) ligadas ao Tailwind pelo `@theme`. Use as classes com esses nomes (`bg-surface`, `text-ink`, `border-line`, `text-muted`, `bg-accent-soft`...): elas já trocam sozinhas no modo escuro, sem `dark:`.

## Como o front fala com o back

O React chama `/api/...` e o Vite repassa para o Django (proxy em `vite.config.ts`).
No Docker, `API_URL=http://backend:8000` aponta para o container do backend.
Não crie rotas de tela começando com `/api`.

## Comandos

```bash
npm ci          # instala as dependências (também no seu computador, para o editor entender o código)
npm run lint    # oxlint
npm run build   # confere os tipos e gera a versão de produção
npm test         # Vitest: regras de pontos, formatação e CSV (lógica pura, sem navegador)
```

Depois de mudar o `package.json`, reinicie o container: `docker compose restart frontend`.
Ele compara o `package-lock.json` com o da última instalação e roda `npm ci` sozinho quando mudou.
