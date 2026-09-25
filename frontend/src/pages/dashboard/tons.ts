// Feito com IA: cada cor do dashboard tem um significado fixo, o mesmo nos KPIs, no gráfico e nas barras:
// azul = pontos acumulados, verde = resgatados, âmbar = custo e vencimento, vermelho = expirados,
// violeta = base de clientes, ciano = vendas. Os níveis usam bronze/prata/ouro (LevelBadge).
// As classes ficam escritas por inteiro (e não montadas com `bg-${cor}`) para o Tailwind achá-las.
export type Tom = "azul" | "verde" | "ambar" | "vermelho" | "violeta" | "ciano";

type Classes = {
  painel: string; // fundo e borda de um bloco tingido
  chip: string; // quadradinho do ícone sobre a superfície do card
  icone: string; // ícone sobre um fundo tingido
  barra: string; // barras de proporção
};

export const TONS: Record<Tom, Classes> = {
  azul: { painel: "border-app/20 bg-app-soft", chip: "bg-app-soft text-app", icone: "text-app", barra: "bg-app" },
  verde: { painel: "border-ok/20 bg-ok-soft", chip: "bg-ok-soft text-ok", icone: "text-ok", barra: "bg-ok" },
  ambar: {
    painel: "border-accent/40 bg-accent-soft",
    chip: "bg-accent-soft text-accent-ink",
    icone: "text-accent-ink",
    barra: "bg-accent",
  },
  vermelho: {
    painel: "border-danger/20 bg-danger-soft",
    chip: "bg-danger-soft text-danger",
    icone: "text-danger",
    barra: "bg-danger",
  },
  violeta: {
    painel: "border-violeta/20 bg-violeta-soft",
    chip: "bg-violeta-soft text-violeta",
    icone: "text-violeta",
    barra: "bg-violeta",
  },
  ciano: { painel: "border-ciano/20 bg-ciano-soft", chip: "bg-ciano-soft text-ciano", icone: "text-ciano", barra: "bg-ciano" },
};
