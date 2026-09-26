import { createContext, useContext } from "react";
import type { CartItem, ClientDashboard, Product } from "../types";

export type ContaValue = {
  // null = sem sessão; o ClienteLayout manda para /login.
  account: ClientDashboard | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  products: Product[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  changeQuantity: (sku: string, change: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
};

export const ContaContext = createContext<ContaValue | null>(null);

// Estado da área do cliente que vive fora das telas: a sessão (painel do cliente) e o carrinho da loja online.
export function useConta() {
  const value = useContext(ContaContext);
  if (!value) throw new Error("useConta precisa estar dentro do ContaProvider.");
  return value;
}
