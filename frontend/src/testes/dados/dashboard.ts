import type { ApiDashboard } from "../../services/api/dashboard";

export const dashboardApi: ApiDashboard = {
  inicio: "2026-07-01",
  fim: "2026-09-30",
  atalhos: [{ rotulo: "Últimos 3 meses", inicio: "2026-07-01", fim: "2026-09-30" }],
  base: {
    total: 2,
    niveis: [
      { nome: "Bronze", bonus: 0, clientes: 1, percentual: 50 },
      { nome: "Prata", bonus: 10, clientes: 1, percentual: 50 },
      { nome: "Ouro", bonus: 20, clientes: 0, percentual: 0 },
    ],
  },
  pontos: {
    acumulados: 537,
    resgatados: 1000,
    expirados: 0,
    taxa_resgate: 50,
    custo: 50,
    custo_sobre_faturamento: 7.3,
    compras: 1,
    em_aberto: 1250,
    em_aberto_reais: 60,
    a_vencer: { dias: 60, pontos: 713, reais: 35 },
  },
  vendas: {
    quantidade: 2,
    faturamento: 689.5,
    ticket_medio: 344.75,
    com_cpf: 1,
    percentual_com_cpf: 50,
    por_caixa: [{ nome: "Araras · Caixa 1", quantidade: 2, faturamento: 689.5, percentual: 100 }],
    por_pagamento: [
      { nome: "Pix", quantidade: 1, faturamento: 489.6, percentual: 71 },
      { nome: "Dinheiro", quantidade: 1, faturamento: 199.9, percentual: 29 },
    ],
    mais_vendidos: [{ sku: "TEN-001", nome: "Tênis Corrida Leve", unidades: 1, receita: 459.7 }],
  },
  resgate_por_nivel: [
    {
      codigo: "PRATA",
      nome: "Prata",
      compras: 1,
      compras_com_resgate: 1,
      taxa_resgate: 100,
      pontos_resgatados: 1000,
      pontos_ganhos: 537,
    },
  ],
  ranking: [
    { posicao: 1, id: 1, nome: "Ana Souza", cpf: "***.982.247-**", nivel_nome: "Prata", acumulado: 2250, saldo: 1250 },
  ],
  evolucao: {
    labels: ["jul/26", "ago/26", "set/26"],
    acumulados: [0, 0, 537],
    resgatados: [0, 0, 1000],
    expirados: [0, 0, 0],
  },
};
