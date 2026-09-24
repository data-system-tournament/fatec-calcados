import { useEffect, useState } from "react";
import { fetchDashboard } from "../services/api";

// Feito com IA: busca os números do dashboard quando a aba abre ou o período muda.
// `cancelled` descarta a resposta antiga se o período mudar antes de ela chegar.
export function useDashboard(period, active) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    fetchDashboard(period)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [period, active]);

  return { data, error };
}
