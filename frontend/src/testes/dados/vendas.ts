import type { ApiSaleDetail, ApiSaleList } from "../../services/api/vendas";

// Venda de R$ 539,60 com resgate de 1.000 pontos (R$ 50,00): paga R$ 489,60 e, sendo Prata,
// ganha 489 * 110 // 100 = 537 pontos (o mesmo exemplo de regras.py).
export const detalheDaVendaApi: ApiSaleDetail = {
  id: "5f0c1b2e-8d3a-4e7b-9c10-2a6b3f4d5e61",
  data: "2026-09-20T15:10:00-03:00",
  cliente: { id: 1, nome: "Ana Souza" },
  caixa: "Araras · Caixa 1",
  forma_pagamento: "Pix",
  valor_bruto: 539.6,
  desconto: 50,
  valor_pago: 489.6,
  pontos_ganhos: 537,
  pontos_resgatados: 1000,
  loja: "Araras",
  nivel_na_compra_nome: "Prata",
  itens: [
    { sku: "TEN-001", nome: "Tênis Corrida Leve", quantidade: 1, preco_unitario: 459.7, subtotal: 459.7 },
    { sku: "MEI-002", nome: "Meia Esportiva", quantidade: 2, preco_unitario: 39.95, subtotal: 79.9 },
  ],
};

export const listaDeVendasApi: ApiSaleList = {
  total: 2,
  pagina: 1,
  paginas: 1,
  faturamento: 689.5,
  desconto: 50,
  filtros: {
    caixas: [{ codigo: "araras-01", nome: "Araras · Caixa 1" }],
    formas_pagamento: [
      { codigo: "PIX", nome: "Pix" },
      { codigo: "DINHEIRO", nome: "Dinheiro" },
    ],
  },
  vendas: [
    {
      id: detalheDaVendaApi.id,
      data: detalheDaVendaApi.data,
      cliente: detalheDaVendaApi.cliente,
      caixa: detalheDaVendaApi.caixa,
      forma_pagamento: "Pix",
      valor_bruto: 539.6,
      desconto: 50,
      valor_pago: 489.6,
      pontos_ganhos: 537,
      pontos_resgatados: 1000,
      itens_qtd: 3,
    },
    // Venda sem CPF: sem cliente e sem pontos.
    {
      id: "0a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d",
      data: "2026-09-21T11:00:00-03:00",
      cliente: null,
      caixa: "Araras · Caixa 1",
      forma_pagamento: "Dinheiro",
      valor_bruto: 199.9,
      desconto: 0,
      valor_pago: 199.9,
      pontos_ganhos: 0,
      pontos_resgatados: 0,
      itens_qtd: 1,
    },
  ],
};
