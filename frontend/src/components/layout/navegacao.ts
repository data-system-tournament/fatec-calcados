import {
  Boxes, CircleUser, LayoutDashboard, Package, Receipt, ShoppingBag, ShoppingCart, Star, Users, Zap, type LucideIcon,
} from "lucide-react";

// Cada tela tem uma cor própria na sidebar: o ícone sempre pintado e o fundo tingido quando ativa.
// As classes ficam escritas por inteiro para o Tailwind achá-las.
export type CorDaRota = { icone: string; ativo: string };

const COR = {
  laranja: { icone: "text-laranja", ativo: "bg-laranja-soft" },
  azul: { icone: "text-app", ativo: "bg-app-soft" },
  violeta: { icone: "text-violeta", ativo: "bg-violeta-soft" },
  ciano: { icone: "text-ciano", ativo: "bg-ciano-soft" },
  rosa: { icone: "text-rosa", ativo: "bg-rosa-soft" },
  esmeralda: { icone: "text-esmeralda", ativo: "bg-esmeralda-soft" },
  ambar: { icone: "text-accent-ink", ativo: "bg-accent-soft" },
} satisfies Record<string, CorDaRota>;

// `end`: só fica ativa no caminho exato (ex.: /minha-conta não acende em /minha-conta/compras).
export type Rota = { to: string; title: string; icon: LucideIcon; cor: CorDaRota; end?: boolean };
export type GrupoDeRotas = { heading?: string; rotas: Rota[] };

// Única lista das telas do sistema: a sidebar, a busca (Ctrl/⌘ K) e o título do cabeçalho leem daqui.
export const GRUPOS: GrupoDeRotas[] = [
  {
    rotas: [
      { to: "/admin/pdv", title: "PDV / Caixa", icon: ShoppingBag, cor: COR.laranja },
      { to: "/admin/dashboard", title: "Dashboard", icon: LayoutDashboard, cor: COR.azul },
    ],
  },
  {
    heading: "Gestão",
    rotas: [
      { to: "/admin/clientes", title: "Clientes", icon: Users, cor: COR.violeta },
      { to: "/admin/vendas", title: "Vendas", icon: Receipt, cor: COR.ciano },
      { to: "/admin/acoes", title: "Ações", icon: Zap, cor: COR.rosa },
      { to: "/admin/avaliacoes", title: "Avaliações", icon: Star, cor: COR.esmeralda },
      { to: "/admin/estoque", title: "Estoque", icon: Boxes, cor: COR.ambar },
    ],
  },
];

export const ROTAS: Rota[] = GRUPOS.flatMap((grupo) => grupo.rotas);

// Área do cliente, organizada como as lojas online (Mercado Livre, Shopee): a loja é a tela inicial
// e "Minha conta" tem o perfil (pontos, como as "moedas" dessas lojas, e dados numa página só, como a
// "Sua conta" da Amazon) e as compras, com tela própria como os pedidos.
export const GRUPOS_CLIENTE: GrupoDeRotas[] = [
  {
    heading: "Loja online",
    rotas: [
      { to: "/loja", title: "Produtos", icon: ShoppingBag, cor: COR.laranja, end: true },
      { to: "/loja/carrinho", title: "Carrinho", icon: ShoppingCart, cor: COR.rosa },
    ],
  },
  {
    heading: "Minha conta",
    rotas: [
      { to: "/minha-conta", title: "Meu perfil", icon: CircleUser, cor: COR.violeta, end: true },
      { to: "/minha-conta/compras", title: "Minhas compras", icon: Package, cor: COR.ciano },
      { to: "/minha-conta/avaliacoes", title: "Avaliações", icon: Star, cor: COR.esmeralda },
    ],
  },
];

export function atalhoBusca(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
}

// "/admin/clientes/12" também é a tela Clientes. Vence a rota mais específica: "/minha-conta/compras" é Minhas compras,
// não "Meu perfil".
export function tituloDaRota(pathname: string, grupos: GrupoDeRotas[] = GRUPOS): string {
  const candidatas = grupos
    .flatMap((grupo) => grupo.rotas)
    .filter((rota) => pathname === rota.to || pathname.startsWith(rota.to + "/"))
    .sort((a, b) => b.to.length - a.to.length);
  return candidatas[0]?.title ?? "";
}
