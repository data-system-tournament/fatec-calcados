# Frontend · FATECalçados

React + Vite. Três abas: **PDV / Caixa**, **Dashboard** e **Ações**. Todos os dados vêm da API do Django.

## Onde está cada coisa

| Arquivo | O que faz |
|---|---|
| `src/App.jsx` | Abas, vendas do caixa (incluindo a fila de vendas offline) e mensagens na tela |
| `src/config.js` | Qual caixa este PDV é (`REGISTER_CODE`) e textos fixos |
| `src/services/api.js` | Todas as chamadas à API. Converte os nomes da API (português) para os usados nas telas |
| `src/pages/Pdv.jsx` + `src/pages/pdv/` | Caixa: busca de produto, carrinho, cliente por CPF, resgate de pontos, recibo |
| `src/pages/Dashboard.jsx` | Dashboard gerencial com filtro de período |
| `src/pages/Actions.jsx` | Ações do gestor: listas de clientes para contatar e mensagem sugerida |
| `src/components/` | Peças reutilizadas: gráficos (Recharts), modal, ícones, mensagem |
| `src/utils/format.js` | Formatação brasileira: dinheiro, CPF, datas |

## Como o front fala com o back

O React chama `/api/...` e o Vite repassa para o Django (proxy em `vite.config.ts`).
No Docker, `API_URL=http://backend:8000` aponta para o container do backend.

## Comandos

```bash
npm ci          # instala as dependências (também no seu computador, para o editor entender o código)
npm run lint    # oxlint
npm run build   # confere os tipos e gera a versão de produção
```

Depois de mudar o `package.json`, atualize também o container:
`docker compose run --rm frontend npm ci`.
