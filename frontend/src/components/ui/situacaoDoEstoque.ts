import type { StockStatus } from "../../types";

// Feito com IA: cores fixas das situações do estoque, as mesmas na tela Estoque, no seletor de numeração do PDV
// e na página do produto: vermelho = esgotado, âmbar = acabando, verde = em dia (como no dashboard). As
// classes ficam escritas por inteiro para o Tailwind achá-las.
//   - selo: etiqueta com o nome da situação;
//   - celula: quadradinho de uma numeração na grade (fundo + borda + texto).
export const SITUACOES: Record<StockStatus, { rotulo: string; selo: string; celula: string }> = {
  ESGOTADO: {
    rotulo: "Esgotado",
    selo: "bg-danger-soft text-danger",
    celula: "border-danger/30 bg-danger-soft text-danger",
  },
  ACABANDO: {
    rotulo: "Acabando",
    selo: "bg-accent-soft text-accent-ink",
    celula: "border-accent/50 bg-accent-soft text-accent-ink",
  },
  OK: {
    rotulo: "Em dia",
    selo: "bg-ok-soft text-ok",
    celula: "border-ok/25 bg-ok-soft text-ok",
  },
};
