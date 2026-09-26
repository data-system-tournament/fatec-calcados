import type { ApiClientDashboard } from "../../services/api/conta";
import { perfilDoClienteApi } from "./clientes";

// Painel da área do cliente: o perfil mais o progresso de nível, pontos a vencer e economia.
export const painelDoClienteApi: ApiClientDashboard = {
  ...perfilDoClienteApi,
  progresso_nivel: 31,
  a_vencer: { dias: 60, pontos: 713, proxima_data: "2026-11-02" },
  economia: 50,
  mais_comprados: [{ sku: "TEN-001", nome: "Tênis Corrida Leve", preco: 459.7, unidades: 1 }],
};
