import { useEffect, useRef, useState } from "react";
import { useToast } from "../contexts/toast";
import { loadSales, saveSales, sendAndMark, sendPendingSales } from "../services/filaVendas";
import type { Sale } from "../types";
import { plural } from "../utils/format";

// Fila de vendas do caixa: guarda no navegador, registra cada venda (enviando ou deixando pendente)
// e reenvia as pendentes. Quem decide se está online é o CaixaProvider.
export function useFilaVendas() {
  const notify = useToast();
  const [sales, setSales] = useState(loadSales);
  const syncedOnLoad = useRef(false);

  const pendingSales = sales.filter((sale) => !sale.synced).length;

  useEffect(() => saveSales(sales), [sales]);

  // Marca as vendas enviadas usando a lista mais recente, para não perder uma venda feita durante o envio.
  function applySync(pendingCount: number, sent: Map<string, Sale>) {
    setSales((current) => current.map((sale) => sent.get(sale.id) ?? sale));

    const failed = pendingCount - sent.size;
    if (failed > 0) notify(`${failed} ${plural(failed, "venda não sincronizou", "vendas não sincronizaram")}. Tente reconectar de novo.`);
    else notify(`${sent.size} ${plural(sent.size, "venda sincronizada", "vendas sincronizadas")} com o painel`);
  }

  function syncPendingSales() {
    const pending = sales.filter((sale) => !sale.synced);
    sendPendingSales(pending).then((sent) => applySync(pending.length, sent));
  }

  // Feito com IA: se a página abrir com vendas pendentes de antes do F5, envia na hora.
  // O ref evita enviar duas vezes no modo de desenvolvimento (o StrictMode roda o efeito duas vezes).
  useEffect(() => {
    if (syncedOnLoad.current) return;
    syncedOnLoad.current = true;
    if (pendingSales > 0) syncPendingSales();
  });

  // Feito com IA: online, envia a venda e usa os valores do backend; offline, guarda a venda
  // com `synced: false` para enviar depois.
  async function recordSale(sale: Sale, online: boolean) {
    if (!online) {
      const pendingSale = { ...sale, synced: false };
      setSales((current) => [...current, pendingSale]);
      return pendingSale;
    }

    const recorded = await sendAndMark(sale);
    setSales((current) => [...current, recorded]);
    return recorded;
  }

  let pointsRedeemedToday = 0;
  for (const sale of sales) {
    if (sale.synced) pointsRedeemedToday += sale.pointsToRedeem;
  }

  return { pendingSales, pointsRedeemedToday, recordSale, syncPendingSales };
}
