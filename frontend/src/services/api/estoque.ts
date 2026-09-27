import type { Stock, StockStatus } from "../../types";
import { queryString, request } from "./http";

// Estoque dos produtos para o gerente (GET /api/estoque/) e o acerto da contagem (POST /api/estoque/<sku>/).

export type ApiStock = {
  resumo: { produtos: number; unidades: number; esgotados: number; acabando: number };
  dias_de_giro: number;
  produtos: { sku: string; nome: string; estoque: number; minimo: number; situacao: StockStatus; vendidos: number }[];
};

export type ApiStockUpdate = { sku: string; estoque: number; minimo: number; situacao: StockStatus };

export async function fetchStock(status = ""): Promise<Stock> {
  const d = await request<ApiStock>(`/api/estoque/${queryString({ situacao: status })}`);
  return {
    summary: { products: d.resumo.produtos, units: d.resumo.unidades, outOfStock: d.resumo.esgotados, runningLow: d.resumo.acabando },
    soldDays: d.dias_de_giro,
    items: d.produtos.map((p) => ({
      sku: p.sku, name: p.nome, quantity: p.estoque, minimum: p.minimo, status: p.situacao, sold: p.vendidos,
    })),
  };
}

export async function updateStock(sku: string, quantity: number, minimum: number) {
  const d = await request<ApiStockUpdate>(`/api/estoque/${encodeURIComponent(sku)}/`, {
    method: "POST",
    body: { quantidade: quantity, minimo: minimum },
  });
  return { sku: d.sku, quantity: d.estoque, minimum: d.minimo, status: d.situacao };
}
