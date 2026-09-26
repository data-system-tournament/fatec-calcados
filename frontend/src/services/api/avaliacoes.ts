import type { StoreReviews } from "../../types";
import { queryString, request } from "./http";

// Avaliações dos clientes vistas pelo gerente (GET /api/avaliacoes/). As do próprio cliente ficam em conta.ts.

export type StoreReviewQuery = { product?: string; rating?: string; page?: number };

export type ApiStoreReviews = {
  total: number;
  pagina: number;
  paginas: number;
  resumo: { total: number; media: number | null; pontos: number };
  por_nota: { nota: number; quantidade: number }[];
  por_produto: { sku: string; nome: string; quantidade: number; media: number }[];
  avaliacoes: {
    id: number;
    data: string;
    cliente: { id: number; nome: string };
    produto: { sku: string; nome: string };
    nota: number;
    comentario: string;
  }[];
};

export async function fetchStoreReviews({ product, rating, page }: StoreReviewQuery): Promise<StoreReviews> {
  const d = await request<ApiStoreReviews>(`/api/avaliacoes/${queryString({ produto: product, nota: rating, pagina: page })}`);
  return {
    total: d.total,
    page: d.pagina,
    pages: d.paginas,
    summary: { total: d.resumo.total, average: d.resumo.media, points: d.resumo.pontos },
    byRating: d.por_nota.map((n) => ({ rating: n.nota, count: n.quantidade })),
    byProduct: d.por_produto.map((p) => ({ sku: p.sku, name: p.nome, count: p.quantidade, average: p.media })),
    reviews: d.avaliacoes.map((a) => ({
      id: a.id,
      date: a.data,
      client: { id: a.cliente.id, name: a.cliente.nome },
      product: { sku: a.produto.sku, name: a.produto.nome },
      rating: a.nota,
      comment: a.comentario,
    })),
  };
}
