import type { Product, ProductDetail, SizeStock, StockStatus } from "../../types";
import { request } from "./http";

// Catálogo (GET /api/produtos/, PDV e loja online) e página do produto (GET /api/produtos/<sku>/).

type ApiSizeStock = { numeracao: number; quantidade: number; situacao: StockStatus };

export type ApiProduct = {
  sku: string;
  nome: string;
  preco: number;
  foto: string;
  usa_numeracao: boolean;
  estoque: number;
  situacao: StockStatus;
  numeracoes: ApiSizeStock[];
  nota_media: number | null;
  avaliacoes: number;
};

export type ApiProducts = { produtos: ApiProduct[] };

export type ApiProductDetail = ApiProduct & {
  descricao: string;
  por_nota: { nota: number; quantidade: number }[];
  comentarios: { id: number; data: string; nome: string; nota: number; comentario: string }[];
};

export function toSizes(numeracoes: ApiSizeStock[]): SizeStock[] {
  return numeracoes.map((n) => ({ size: n.numeracao, quantity: n.quantidade, status: n.situacao }));
}

function toProduct(p: ApiProduct): Product {
  return {
    sku: p.sku,
    name: p.nome,
    price: p.preco,
    photo: p.foto || null,
    usesSizes: p.usa_numeracao,
    stock: p.estoque,
    stockStatus: p.situacao,
    sizes: toSizes(p.numeracoes),
    rating: p.nota_media,
    reviewCount: p.avaliacoes,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<ApiProducts>("/api/produtos/");
  return data.produtos.map(toProduct);
}

export async function fetchProductDetail(sku: string): Promise<ProductDetail> {
  const d = await request<ApiProductDetail>(`/api/produtos/${encodeURIComponent(sku)}/`);
  return {
    ...toProduct(d),
    description: d.descricao,
    byRating: d.por_nota.map((n) => ({ rating: n.nota, count: n.quantidade })),
    comments: d.comentarios.map((c) => ({ id: c.id, date: c.data, name: c.nome, rating: c.nota, comment: c.comentario })),
  };
}
