import { useState } from "react";
import { montarNotificacoes } from "../pages/conta/notificacoes";
import type { ClientDashboard } from "../types";

function chave(clienteId: number) {
  return `fatec:notificacoes-lidas:${clienteId}`;
}

function lerLidas(clienteId: number): string[] {
  try {
    const salvas = JSON.parse(localStorage.getItem(chave(clienteId)) || "[]");
    return Array.isArray(salvas) ? salvas : [];
  } catch {
    return [];
  }
}

// Feito com IA: notificações do cliente logado e quais ele já viu. O "lido" é só uma conveniência deste
// navegador (localStorage, uma chave por cliente); sem localStorage tudo aparece como novo, sem quebrar.
// Marcar como lidas guarda só os ids atuais, então avisos que sumiram não se acumulam na chave.
export function useNotificacoes(account: ClientDashboard) {
  const [lidas, setLidas] = useState(() => lerLidas(account.id));
  const notificacoes = montarNotificacoes(account, new Date());
  const naoLidas = notificacoes.filter((n) => !lidas.includes(n.id)).map((n) => n.id);

  function marcarComoLidas() {
    const ids = notificacoes.map((n) => n.id);
    setLidas(ids);
    try {
      localStorage.setItem(chave(account.id), JSON.stringify(ids));
    } catch {
      // Sem localStorage: vale só até recarregar a página.
    }
  }

  return { notificacoes, naoLidas, marcarComoLidas };
}
