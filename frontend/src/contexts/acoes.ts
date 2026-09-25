import { createContext, useContext } from "react";
import type { Action } from "../types";

export type AcoesValue = {
  actions: Action[];
  status: "loading" | "ready" | "error";
  error: string;
  doneTypes: string[];
  loadActions: () => void;
  retry: () => void;
  markDone: (type: string) => void;
  openCount: number;
};

export const AcoesContext = createContext<AcoesValue | null>(null);

// Listas da aba Ações e quais o gestor já marcou como feitas (o contador da aba usa isso).
export function useAcoes() {
  const value = useContext(AcoesContext);
  if (!value) throw new Error("useAcoes precisa estar dentro do AcoesProvider.");
  return value;
}
