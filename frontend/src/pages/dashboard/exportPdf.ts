import type { DashboardData } from "../../types";

// Feito com IA: o PDF sai da janela de impressão do navegador ("Salvar como PDF"), sem biblioteca; o
// layout de papel está nas regras @media print de index.css. O Chrome usa o título da página como nome
// do arquivo, então ele vira o mesmo nome do CSV enquanto a janela está aberta.
export function exportDashboardPdf(data: DashboardData) {
  const tituloAnterior = document.title;
  document.title = `dashboard-fidelidade_${data.start}_${data.end}`;
  window.addEventListener("afterprint", () => { document.title = tituloAnterior; }, { once: true });
  window.print();
}
