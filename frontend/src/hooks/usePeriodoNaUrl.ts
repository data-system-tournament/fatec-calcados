import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Period } from "../types";

// Feito com IA: o período fica na URL (/dashboard?inicio=...&fim=...), então dá para
// recarregar a página ou mandar o link sem perder o filtro. Sem parâmetros, o backend usa o padrão.
export function usePeriodoNaUrl(): [Period | null, (period: Period) => void] {
  const [params, setParams] = useSearchParams();
  const start = params.get("inicio");
  const end = params.get("fim");

  const period = useMemo(() => (start && end ? { start, end } : null), [start, end]);

  function setPeriod(next: Period) {
    setParams({ inicio: next.start, fim: next.end });
  }

  return [period, setPeriod];
}
