import type { DashboardData } from "../../types";
import { downloadCsv, type CsvCell } from "./csv";
import { formatDate } from "../../utils/format";

// Linhas do CSV do dashboard: uma seção por bloco da tela, separadas por uma linha em branco.
export function dashboardRows(data: DashboardData): CsvCell[][] {
  const { points, sales } = data;
  return [
    ["Programa de fidelidade FATECalçados", `${formatDate(data.start)} a ${formatDate(data.end)}`],
    [],
    ["Resumo do período"],
    ["Clientes cadastrados", data.totalClients],
    ["Pontos acumulados", points.earned],
    ["Pontos resgatados", points.redeemed],
    ["Pontos expirados", points.expired],
    ["Taxa de resgate (%)", points.redeemRate],
    ["Custo do programa (R$)", points.cost],
    ["Custo sobre o faturamento (%)", points.costPercent],
    ["Saldo de pontos em aberto", points.openBalance],
    ["Saldo em aberto (R$)", points.openBalanceValue],
    [`Pontos que vencem em ${points.expiring.days} dias`, points.expiring.points],
    [`Vencem em ${points.expiring.days} dias (R$)`, points.expiring.value],
    [],
    ["Vendas"],
    ["Quantidade de vendas", sales.count],
    ["Faturamento (R$)", sales.revenue],
    ["Ticket médio (R$)", sales.averageTicket],
    ["Vendas com CPF (%)", sales.withCpfPercent],
    [],
    ["Por forma de pagamento", "Vendas", "Faturamento (R$)", "Participação (%)"],
    ...sales.byPayment.map((g): CsvCell[] => [g.name, g.count, g.revenue, g.percent]),
    [],
    ["Por caixa", "Vendas", "Faturamento (R$)", "Participação (%)"],
    ...sales.byRegister.map((g): CsvCell[] => [g.name, g.count, g.revenue, g.percent]),
    [],
    ["Produtos mais vendidos", "Código", "Unidades", "Receita (R$)"],
    ...sales.topProducts.map((p): CsvCell[] => [p.name, p.sku, p.units, p.revenue]),
    [],
    ["Resgate por nível", "Compras com CPF", "Compras com resgate", "Taxa de resgate (%)", "Pontos resgatados", "Pontos ganhos"],
    ...data.redemptionByLevel.map((n): CsvCell[] => [
      n.name, n.purchases, n.purchasesWithRedemption, n.redeemRate, n.pointsRedeemed, n.pointsEarned,
    ]),
    [],
    ["Evolução por mês", "Acumulados", "Resgatados", "Expirados"],
    ...data.monthly.map((m): CsvCell[] => [m.month, m.earned, m.redeemed, m.expired]),
    [],
    ["Ranking", "Cliente", "CPF", "Nível", "Acumulado", `Saldo em ${formatDate(data.end)}`],
    ...data.ranking.map((r): CsvCell[] => [r.position, r.name, r.cpf, r.level, r.earned, r.balance]),
  ];
}

export function exportDashboardCsv(data: DashboardData) {
  downloadCsv(`dashboard-fidelidade_${data.start}_${data.end}.csv`, dashboardRows(data));
}
