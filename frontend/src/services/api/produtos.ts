import type { Product } from "../../types";
import { request } from "./http";

export type ApiProducts = { produtos: { sku: string; nome: string; preco: number }[] };

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<ApiProducts>("/api/produtos/");
  return data.produtos.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco }));
}
