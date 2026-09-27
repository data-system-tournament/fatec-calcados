import type { ApiStock } from "../../services/api/estoque";

// Três produtos, um em cada situação (o esgotado primeiro, como o backend ordena).
export const estoqueApi: ApiStock = {
  resumo: { produtos: 3, unidades: 45, esgotados: 1, acabando: 1 },
  dias_de_giro: 30,
  produtos: [
    { sku: "BOT-003", nome: "Bota Couro", estoque: 0, minimo: 5, situacao: "ESGOTADO", vendidos: 4 },
    { sku: "MEI-002", nome: "Meia Esportiva", estoque: 3, minimo: 5, situacao: "ACABANDO", vendidos: 11 },
    { sku: "TEN-001", nome: "Tênis Corrida Leve", estoque: 42, minimo: 5, situacao: "OK", vendidos: 7 },
  ],
};
