import type { Sale } from "../types";
import { sendSale } from "./api";

const SALES_KEY = "fatec:vendas";

// Feito com IA: a fila de vendas fica salva no navegador para um F5 não apagar vendas feitas offline.
// Vendas pendentes sempre voltam; as já sincronizadas só voltam se forem de hoje (para o "Pulso de hoje").
export function loadSales(): Sale[] {
  try {
    const saved: Sale[] = JSON.parse(localStorage.getItem(SALES_KEY) ?? "[]");
    const today = new Date().toDateString();
    return saved.filter((sale) => !sale.synced || new Date(sale.date).toDateString() === today);
  } catch {
    return [];
  }
}

export function saveSales(sales: Sale[]) {
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  } catch {
    // Sem localStorage (aba anônima, bloqueado): a fila continua só na memória, como antes.
  }
}

// Envia a venda e devolve ela já com os valores oficiais do backend (total e pontos).
export async function sendAndMark(sale: Sale): Promise<Sale> {
  const result = await sendSale(sale);
  return { ...sale, total: result.total, points: result.pointsEarned, synced: true };
}

// Feito com IA: envia as vendas pendentes uma por uma; as que falharem continuam pendentes.
// O `id` de cada venda é gerado no caixa, então reenviar a mesma venda não duplica no backend.
export async function sendPendingSales(pending: Sale[]) {
  const sent = new Map<string, Sale>();
  for (const sale of pending) {
    try {
      sent.set(sale.id, await sendAndMark(sale));
    } catch {
      // continua pendente
    }
  }
  return sent;
}
