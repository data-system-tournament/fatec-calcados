import type { ApiProducts } from "../../services/api/produtos";

export const produtosApi: ApiProducts = {
  produtos: [
    { sku: "TEN-001", nome: "Tênis Corrida Leve", preco: 459.7, foto: "https://images.unsplash.com/photo-1?w=600" },
    { sku: "MEI-002", nome: "Meia Esportiva", preco: 39.95, foto: "" },
  ],
};
