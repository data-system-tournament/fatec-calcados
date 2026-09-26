import type { ApiStoreReviews } from "../../services/api/avaliacoes";

// Três avaliações: o tênis com 5 e 4 estrelas, a meia com 2. A lista veio filtrada pela meia.
export const avaliacoesDaLojaApi: ApiStoreReviews = {
  total: 1,
  pagina: 1,
  paginas: 1,
  resumo: { total: 3, media: 3.7, pontos: 60 },
  por_nota: [
    { nota: 5, quantidade: 1 },
    { nota: 4, quantidade: 1 },
    { nota: 3, quantidade: 0 },
    { nota: 2, quantidade: 1 },
    { nota: 1, quantidade: 0 },
  ],
  por_produto: [
    { sku: "TEN-001", nome: "Tênis Corrida Leve", quantidade: 2, media: 4.5 },
    { sku: "MEI-002", nome: "Meia Esportiva", quantidade: 1, media: 2 },
  ],
  avaliacoes: [
    {
      id: 3,
      data: "2026-09-23T10:00:00-03:00",
      cliente: { id: 1, nome: "Ana Souza" },
      produto: { sku: "MEI-002", nome: "Meia Esportiva" },
      nota: 2,
      comentario: "Furou depois de duas semanas de uso.",
    },
  ],
};
