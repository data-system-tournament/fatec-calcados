import type { ApiProductDetail, ApiProducts } from "../../services/api/produtos";

// Um calçado (estoque por numeração, com avaliação) e um acessório (estoque único, sem avaliação).
export const produtosApi: ApiProducts = {
  produtos: [
    {
      sku: "TEN-001", nome: "Tênis Corrida Leve", preco: 459.7, foto: "https://images.unsplash.com/photo-1?w=600",
      usa_numeracao: true, estoque: 7, situacao: "ACABANDO",
      numeracoes: [
        { numeracao: 39, quantidade: 7, situacao: "OK" },
        { numeracao: 40, quantidade: 0, situacao: "ESGOTADO" },
      ],
      nota_media: 4.5, avaliacoes: 2,
    },
    {
      sku: "MEI-002", nome: "Meia Esportiva", preco: 39.95, foto: "",
      usa_numeracao: false, estoque: 12, situacao: "OK", numeracoes: [], nota_media: null, avaliacoes: 0,
    },
  ],
};

export const detalheDoProdutoApi: ApiProductDetail = {
  ...produtosApi.produtos[0],
  descricao: "Tênis leve para correr.",
  por_nota: [
    { nota: 5, quantidade: 1 }, { nota: 4, quantidade: 1 }, { nota: 3, quantidade: 0 }, { nota: 2, quantidade: 0 },
    { nota: 1, quantidade: 0 },
  ],
  comentarios: [{ id: 9, data: "2026-09-10T10:00:00-03:00", nome: "Ana", nota: 5, comentario: "Muito confortável, uso todo dia." }],
};
