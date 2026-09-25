import { fetchDashboard } from "../services/api";
import type { Period } from "../types";
import { useCarregar } from "./useCarregar";

// Números do dashboard para o período pedido (null = o padrão do backend).
export function useDashboard(period: Period | null) {
  return useCarregar(() => fetchDashboard(period), period ? `${period.start}|${period.end}` : "");
}
