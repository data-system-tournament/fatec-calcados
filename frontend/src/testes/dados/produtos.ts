import type { ApiProducts } from "../../services/api/produtos";

export const produtosApi: ApiProducts = {
  produtos: [
    { sku: "TEN-001", nome: "Tênis Corrida Leve", preco: 459.7 },
    { sku: "MEI-002", nome: "Meia Esportiva", preco: 39.95 },
  ],
};
