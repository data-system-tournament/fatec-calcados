import type { DashboardData, LevelRedemption, Period, RankingRow, SalesGroup } from "../../types";
import { queryString, request } from "./http";

export type ApiSalesGroup = { nome: string; quantidade: number; faturamento: number; percentual: number };

function toSalesGroup(g: ApiSalesGroup): SalesGroup {
  return { name: g.nome, count: g.quantidade, revenue: g.faturamento, percent: g.percentual };
}

export type ApiDashboard = {
  inicio: string;
  fim: string;
  atalhos: { rotulo: string; inicio: string; fim: string }[];
  base: { total: number; niveis: { nome: string; bonus: number; clientes: number; percentual: number }[] };
  pontos: {
    acumulados: number;
    resgatados: number;
    expirados: number;
    taxa_resgate: number;
    custo: number;
    custo_sobre_faturamento: number;
    compras: number;
    em_aberto: number;
    em_aberto_reais: number;
    a_vencer: { dias: number; pontos: number; reais: number };
  };
  vendas: {
    quantidade: number;
    faturamento: number;
    ticket_medio: number;
    com_cpf: number;
    percentual_com_cpf: number;
    por_caixa: ApiSalesGroup[];
    por_pagamento: ApiSalesGroup[];
    mais_vendidos: { sku: string; nome: string; unidades: number; receita: number }[];
  };
  resgate_por_nivel: {
    codigo: string;
    nome: string;
    compras: number;
    compras_com_resgate: number;
    taxa_resgate: number;
    pontos_resgatados: number;
    pontos_ganhos: number;
  }[];
  ranking: {
    posicao: number;
    id: number;
    nome: string;
    cpf: string;
    nivel_nome: string;
    acumulado: number;
    saldo: number;
  }[];
  evolucao: { labels: string[]; acumulados: number[]; resgatados: number[]; expirados: number[] };
};

export async function fetchDashboard(period?: Period | null): Promise<DashboardData> {
  const query = period ? queryString({ inicio: period.start, fim: period.end }) : "";
  const data = await request<ApiDashboard>(`/api/dashboard/${query}`);
  const { pontos, vendas, evolucao } = data;

  const ranking: RankingRow[] = data.ranking.map((r) => ({
    position: r.posicao,
    id: r.id,
    name: r.nome,
    cpf: r.cpf,
    level: r.nivel_nome,
    earned: r.acumulado,
    balance: r.saldo,
  }));
  const redemptionByLevel: LevelRedemption[] = data.resgate_por_nivel.map((n) => ({
    code: n.codigo,
    name: n.nome,
    purchases: n.compras,
    purchasesWithRedemption: n.compras_com_resgate,
    redeemRate: n.taxa_resgate,
    pointsRedeemed: n.pontos_resgatados,
    pointsEarned: n.pontos_ganhos,
  }));

  return {
    start: data.inicio,
    end: data.fim,
    shortcuts: data.atalhos.map((a) => ({ label: a.rotulo, start: a.inicio, end: a.fim })),
    totalClients: data.base.total,
    levels: data.base.niveis.map((n) => ({
      name: n.nome,
      bonus: n.bonus,
      clients: n.clientes,
      percent: n.percentual,
    })),
    points: {
      earned: pontos.acumulados,
      redeemed: pontos.resgatados,
      expired: pontos.expirados,
      redeemRate: pontos.taxa_resgate,
      cost: pontos.custo,
      costPercent: pontos.custo_sobre_faturamento,
      purchases: pontos.compras,
      openBalance: pontos.em_aberto,
      openBalanceValue: pontos.em_aberto_reais,
      expiring: { days: pontos.a_vencer.dias, points: pontos.a_vencer.pontos, value: pontos.a_vencer.reais },
    },
    sales: {
      count: vendas.quantidade,
      revenue: vendas.faturamento,
      averageTicket: vendas.ticket_medio,
      withCpf: vendas.com_cpf,
      withCpfPercent: vendas.percentual_com_cpf,
      byRegister: vendas.por_caixa.map(toSalesGroup),
      byPayment: vendas.por_pagamento.map(toSalesGroup),
      topProducts: vendas.mais_vendidos.map((p) => ({ sku: p.sku, name: p.nome, units: p.unidades, revenue: p.receita })),
    },
    redemptionByLevel,
    ranking,
    monthly: evolucao.labels.map((month, i) => ({
      month,
      earned: evolucao.acumulados[i],
      redeemed: evolucao.resgatados[i],
      expired: evolucao.expirados[i],
    })),
  };
}
