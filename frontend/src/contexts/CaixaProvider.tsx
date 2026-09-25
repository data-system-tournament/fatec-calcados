import { useEffect, useState, type ReactNode } from "react";
import { REGISTER_NAME } from "../config";
import { useFilaVendas } from "../hooks/useFilaVendas";
import { fetchProducts } from "../services/api";
import type { Client, CurrentSale, Product, Sale } from "../types";
import { currentTime } from "../utils/format";
import { CaixaContext, type CaixaValue } from "./caixa";
import { useToast } from "./toast";

const EMPTY_SALE: CurrentSale = { cart: [], client: null, paymentMethod: "PIX", pointsToRedeem: 0 };

// Junta o que vive fora da tela do PDV: conexão (simulada), fila de vendas, produtos e a venda em andamento.
export function CaixaProvider({ children }: { children: ReactNode }) {
  const notify = useToast();
  const [openedAt] = useState(currentTime);
  const [online, setOnline] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [newClientsToday, setNewClientsToday] = useState(0);
  const [currentSale, setCurrentSale] = useState(EMPTY_SALE);
  const { pendingSales, pointsRedeemedToday, recordSale, syncPendingSales } = useFilaVendas();

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((error) => notify(`Não foi possível carregar os produtos: ${error.message}`));
  }, [notify]);

  function finishSale(sale: Sale) {
    return recordSale(sale, online);
  }

  function toggleOnline() {
    if (online) {
      setOnline(false);
      notify(`${REGISTER_NAME} sem internet. Vendas continuam normalmente.`);
      return;
    }

    setOnline(true);
    if (pendingSales === 0) notify(`${REGISTER_NAME} online`);
    else syncPendingSales();
  }

  function clientRegistered(client: Client) {
    setNewClientsToday((count) => count + 1);
    notify(`${client.name} cadastrado(a) no nível ${client.level}`);
  }

  // Venda em andamento: fica aqui (e não na tela do PDV) para não sumir ao trocar de aba.
  function updateSale(changes: Partial<CurrentSale>) {
    setCurrentSale((sale) => ({ ...sale, ...changes }));
  }

  function resetSale() {
    setCurrentSale(EMPTY_SALE);
  }

  const value: CaixaValue = {
    openedAt,
    online,
    toggleOnline,
    pendingSales,
    finishSale,
    products,
    newClientsToday,
    clientRegistered,
    pointsRedeemedToday,
    registers: [{ name: REGISTER_NAME, online, pending: pendingSales }],
    currentSale,
    updateSale,
    resetSale,
  };

  return <CaixaContext.Provider value={value}>{children}</CaixaContext.Provider>;
}
