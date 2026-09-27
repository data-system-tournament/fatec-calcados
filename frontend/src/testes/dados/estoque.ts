import type { ApiStock } from "../../services/api/estoque";

// Três produtos, um em cada situação (o esgotado primeiro, como o backend ordena). O tênis tem grade de
// numerações; a bota e a meia, não.
export const estoqueApi: ApiStock = {
  resumo: { produtos: 3, unidades: 45, esgotados: 1, acabando: 1, numeracoes_esgotadas: 1 },
  dias_de_giro: 30,
  produtos: [
    {
      sku: "BOT-003", nome: "Bota Couro", usa_numeracao: false, estoque: 0, minimo: 5, situacao: "ESGOTADO",
      vendidos: 4, numeracoes: [],
    },
    {
      sku: "MEI-002", nome: "Meia Esportiva", usa_numeracao: false, estoque: 3, minimo: 5, situacao: "ACABANDO",
      vendidos: 11, numeracoes: [],
    },
    {
      sku: "TEN-001", nome: "Tênis Corrida Leve", usa_numeracao: true, estoque: 42, minimo: 2, situacao: "OK",
      vendidos: 7,
      numeracoes: [
        { numeracao: 39, quantidade: 20, situacao: "OK" },
        { numeracao: 40, quantidade: 22, situacao: "OK" },
      ],
    },
  ],
};
