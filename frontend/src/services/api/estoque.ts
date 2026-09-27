import type { Stock, StockItem, StockStatus } from "../../types";
import { queryString, request } from "./http";
import { toSizes } from "./produtos";

// Estoque dos produtos para o gerente (GET /api/estoque/) e o acerto da contagem (POST /api/estoque/<sku>/),
// que no calçado é de uma numeração.

type ApiStockItem = {
  sku: string;
  nome: string;
  usa_numeracao: boolean;
  estoque: number;
  minimo: number;
  situacao: StockStatus;
  vendidos: number;
  numeracoes: { numeracao: number; quantidade: number; situacao: StockStatus }[];
};

export type ApiStock = {
  resumo: { produtos: number; unidades: number; esgotados: number; acabando: number; numeracoes_esgotadas: number };
  dias_de_giro: number;
  produtos: ApiStockItem[];
};

// O POST responde com a linha do produto igual à da lista.
export type ApiStockUpdate = ApiStockItem;

function toStockItem(p: ApiStockItem): StockItem {
  return {
    sku: p.sku,
    name: p.nome,
    usesSizes: p.usa_numeracao,
    quantity: p.estoque,
    minimum: p.minimo,
    status: p.situacao,
    sold: p.vendidos,
    sizes: toSizes(p.numeracoes),
  };
}

export async function fetchStock(status = ""): Promise<Stock> {
  const d = await request<ApiStock>(`/api/estoque/${queryString({ situacao: status })}`);
  return {
    summary: {
      products: d.resumo.produtos,
      units: d.resumo.unidades,
      outOfStock: d.resumo.esgotados,
      runningLow: d.resumo.acabando,
      sizesOut: d.resumo.numeracoes_esgotadas,
    },
    soldDays: d.dias_de_giro,
    items: d.produtos.map(toStockItem),
  };
}

// `size` só no calçado: grava a contagem daquela numeração (o mínimo vale para todas).
export async function updateStock(sku: string, quantity: number, minimum: number, size: number | null = null): Promise<StockItem> {
  const body: Record<string, number> = { quantidade: quantity, minimo: minimum };
  if (size !== null) body.numeracao = size;
  const d = await request<ApiStockUpdate>(`/api/estoque/${encodeURIComponent(sku)}/`, { method: "POST", body });
  return toStockItem(d);
}
