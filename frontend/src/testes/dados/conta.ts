import type { ApiClientDashboard, ApiReviews } from "../../services/api/conta";
import { perfilDoClienteApi } from "./clientes";

// Painel da área do cliente: o perfil mais o progresso de nível, pontos a vencer e economia.
export const painelDoClienteApi: ApiClientDashboard = {
  ...perfilDoClienteApi,
  // A meia de avaliacoesApi, logo abaixo.
  avaliacoes_pendentes: { quantidade: 1, pontos: 20, ultima_compra: "2026-09-20T15:10:00-03:00" },
  progresso_nivel: 32,
  a_vencer: { dias: 60, pontos: 713, proxima_data: "2026-11-02" },
  economia: 50,
  mais_comprados: [{ sku: "TEN-001", nome: "Tênis Corrida Leve", preco: 459.7, foto: "https://images.unsplash.com/photo-1?w=600", unidades: 1 }],
};

// Comprou o tênis (já avaliado) e a meia (falta avaliar).
export const avaliacoesApi: ApiReviews = {
  pontos_por_avaliacao: 20,
  comentario_minimo: 20,
  para_avaliar: [{ sku: "MEI-002", nome: "Meia Esportiva", preco: 39.95, foto: "", ultima_compra: "2026-09-20T15:10:00-03:00" }],
  avaliadas: [
    {
      sku: "TEN-001",
      nome: "Tênis Corrida Leve",
      foto: "https://images.unsplash.com/photo-1?w=600",
      nota: 5,
      comentario: "Muito confortável, uso todo dia.",
      data: "2026-09-22T09:00:00-03:00",
      pontos: 20,
    },
  ],
};
