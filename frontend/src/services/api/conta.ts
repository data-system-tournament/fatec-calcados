import type { ClientDashboard, OnlinePurchase, OnlinePurchaseResult, SaleDetail } from "../../types";
import { toClientProfile, type ApiClientProfile } from "./clientes";
import { ApiError, ensureCsrfCookie, request } from "./http";
import { toSaleDetail, type ApiSaleDetail } from "./vendas";

// Área do cliente (/api/conta/, com sessão).

export type ApiClientDashboard = ApiClientProfile & {
  progresso_nivel: number;
  a_vencer: { dias: number; pontos: number; proxima_data: string | null };
  economia: number;
  mais_comprados: { sku: string; nome: string; preco: number; unidades: number }[];
};

function toClientDashboard(d: ApiClientDashboard): ClientDashboard {
  return {
    ...toClientProfile(d),
    levelProgress: d.progresso_nivel,
    expiring: { days: d.a_vencer.dias, points: d.a_vencer.pontos, nextDate: d.a_vencer.proxima_data },
    savings: d.economia,
    topProducts: d.mais_comprados.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco, units: p.unidades })),
  };
}

// Painel do cliente logado, ou null se não houver sessão (401). Também é esta chamada que traz o
// cookie csrftoken, necessário para os POST abaixo.
export async function fetchAccount(): Promise<ClientDashboard | null> {
  try {
    return toClientDashboard(await request<ApiClientDashboard>("/api/conta/"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function signIn(cpf: string, password: string): Promise<ClientDashboard> {
  await ensureCsrfCookie();
  return toClientDashboard(
    await request<ApiClientDashboard>("/api/conta/entrar/", { method: "POST", body: { cpf, senha: password } }),
  );
}

export async function createAccess(cpf: string, name: string, password: string): Promise<ClientDashboard> {
  await ensureCsrfCookie();
  return toClientDashboard(
    await request<ApiClientDashboard>("/api/conta/cadastro/", {
      method: "POST",
      body: { cpf, nome: name, senha: password },
    }),
  );
}

export async function signOut(): Promise<void> {
  await request("/api/conta/sair/", { method: "POST" });
}

export async function buyOnline(purchase: OnlinePurchase): Promise<OnlinePurchaseResult> {
  const data = await request<{
    id: string;
    valor_pago: number;
    desconto: number;
    pontos_ganhos: number;
    saldo_atual: number | null;
  }>("/api/conta/compras/", {
    method: "POST",
    body: {
      id: purchase.id,
      itens: purchase.items.map((item) => ({ sku: item.sku, quantidade: item.quantity })),
      forma_pagamento: purchase.payment,
      pontos_resgate: purchase.pointsToRedeem,
    },
  });
  return {
    id: data.id,
    total: data.valor_pago,
    discount: data.desconto,
    pointsEarned: data.pontos_ganhos,
    balance: data.saldo_atual,
  };
}

export async function fetchAccountPurchase(id: string): Promise<SaleDetail> {
  return toSaleDetail(await request<ApiSaleDetail>(`/api/conta/compras/${id}/`));
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request("/api/conta/senha/", { method: "POST", body: { senha_atual: currentPassword, nova_senha: newPassword } });
}
