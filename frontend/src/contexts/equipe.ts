import { createContext, useContext } from "react";
import type { StaffUser } from "../types";

export type EquipeValue = { user: StaffUser; signOut: () => Promise<void> };

export const EquipeContext = createContext<EquipeValue | null>(null);

// Usuário da equipe logado na área /admin. Só existe dentro do EquipeProvider, que já garantiu a sessão.
export function useEquipe() {
  const value = useContext(EquipeContext);
  if (!value) throw new Error("useEquipe precisa estar dentro do EquipeProvider.");
  return value;
}
