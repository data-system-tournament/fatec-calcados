import { LayoutDashboard, Receipt, ShoppingBag, Users, Zap, type LucideIcon } from "lucide-react";

export type Rota = { to: string; title: string; icon: LucideIcon };
export type GrupoDeRotas = { heading?: string; rotas: Rota[] };

// Única lista das telas do sistema: a sidebar, a busca (Ctrl/⌘ K) e o título do cabeçalho leem daqui.
export const GRUPOS: GrupoDeRotas[] = [
  {
    rotas: [
      { to: "/pdv", title: "PDV / Caixa", icon: ShoppingBag },
      { to: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Gestão",
    rotas: [
      { to: "/clientes", title: "Clientes", icon: Users },
      { to: "/vendas", title: "Vendas", icon: Receipt },
      { to: "/acoes", title: "Ações", icon: Zap },
    ],
  },
];

export const ROTAS: Rota[] = GRUPOS.flatMap((grupo) => grupo.rotas);

export function atalhoBusca(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
}

// "/clientes/12" também é a tela Clientes.
export function tituloDaRota(pathname: string): string {
  return ROTAS.find((rota) => pathname === rota.to || pathname.startsWith(rota.to + "/"))?.title ?? "";
}
