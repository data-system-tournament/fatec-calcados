import { createContext, useContext } from "react";
import type { Client, CurrentSale, Product, Register, Sale } from "../types";

export type CaixaValue = {
  openedAt: string;
  online: boolean;
  toggleOnline: () => void;
  pendingSales: number;
  finishSale: (sale: Sale) => Promise<Sale>;
  products: Product[];
  newClientsToday: number;
  clientRegistered: (client: Client) => void;
  pointsRedeemedToday: number;
  registers: Register[];
  currentSale: CurrentSale;
  updateSale: (changes: Partial<CurrentSale>) => void;
  resetSale: () => void;
};

export const CaixaContext = createContext<CaixaValue | null>(null);

// Estado do caixa que vive fora da tela do PDV: conexão, fila de vendas e a venda em andamento.
export function useCaixa() {
  const value = useContext(CaixaContext);
  if (!value) throw new Error("useCaixa precisa estar dentro do CaixaProvider.");
  return value;
}
