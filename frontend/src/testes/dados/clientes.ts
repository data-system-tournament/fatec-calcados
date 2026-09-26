import type { ApiClient, ApiClientList, ApiClientProfile } from "../../services/api/clientes";

// Cliente Prata (10% de bônus) com 1.250 pontos: 1.200 resgatáveis (12 blocos de 100) = R$ 60,00.
export const clientePdvApi: ApiClient = {
  cpf: "52998224725",
  nome: "Ana Souza",
  nivel_nome: "Prata",
  bonus_percentual: 10,
  saldo_pontos: 1250,
  pontos_resgataveis: 1200,
  valor_resgatavel: 60,
};

// Nas listas o CPF chega mascarado (cpf.mascarar do backend).
export const listaDeClientesApi: ApiClientList = {
  total: 2,
  pagina: 1,
  paginas: 1,
  clientes: [
    {
      id: 1,
      nome: "Ana Souza",
      cpf: "***.982.247-**",
      nivel_nome: "Prata",
      saldo_pontos: 1250,
      compras: 4,
      ultima_compra: "2026-09-20T15:10:00-03:00",
    },
    {
      id: 2,
      nome: "Bruno Lima",
      cpf: "***.444.777-**",
      nivel_nome: "Bronze",
      saldo_pontos: 0,
      compras: 0,
      ultima_compra: null,
    },
  ],
};

// Além das compras, avaliou o tênis (+20 pts, lote próprio): saldo 1.250 + 20 = 1.270.
export const perfilDoClienteApi: ApiClientProfile = {
  id: 1,
  nome: "Ana Souza",
  cpf: "***.982.247-**",
  cadastrado_em: "2025-11-02T10:00:00-03:00",
  loja_cadastro: "Araras",
  nivel_nome: "Prata",
  bonus_percentual: 10,
  pontos_12m: 2270,
  proximo_nivel: { nome: "Ouro", faltam: 2730 },
  saldo_pontos: 1270,
  pontos_resgataveis: 1200,
  valor_resgatavel: 60,
  total_compras: 4,
  total_gasto: 1789.6,
  total_pontos_ganhos: 2250,
  total_pontos_resgatados: 1000,
  lotes: [
    { pontos: 713, expira_em: "2026-11-02" },
    { pontos: 537, expira_em: "2027-09-20" },
    { pontos: 20, expira_em: "2027-09-22" },
  ],
  compras: [
    {
      id: "5f0c1b2e-8d3a-4e7b-9c10-2a6b3f4d5e61",
      data: "2026-09-20T15:10:00-03:00",
      caixa: "Araras · Caixa 1",
      forma_pagamento: "Pix",
      valor_pago: 489.6,
      desconto: 50,
      pontos_ganhos: 537,
      pontos_resgatados: 1000,
    },
  ],
  movimentos: [
    { data: "2026-09-22T09:00:00-03:00", tipo: "ACUMULO", pontos: 20, avaliacao: "Tênis Corrida Leve" },
    { data: "2026-09-20T15:10:00-03:00", tipo: "RESGATE", pontos: -1000, avaliacao: null },
    { data: "2026-09-20T15:10:00-03:00", tipo: "ACUMULO", pontos: 537, avaliacao: null },
  ],
};
