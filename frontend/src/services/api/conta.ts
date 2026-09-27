import type { ClientDashboard, OnlinePurchase, OnlinePurchaseResult, ProfileUpdate, Reviews, SaleDetail } from "../../types";
import { toClientProfile, type ApiClientProfile } from "./clientes";
import { ApiError, ensureCsrfCookie, request } from "./http";
import { itemParaApi, toSaleDetail, type ApiSaleDetail } from "./vendas";

// Área do cliente (/api/conta/, com sessão).

export type ApiClientDashboard = ApiClientProfile & {
  avaliacoes_pendentes: { quantidade: number; pontos: number; ultima_compra: string | null };
  progresso_nivel: number;
  a_vencer: { dias: number; pontos: number; proxima_data: string | null };
  economia: number;
  mais_comprados: { sku: string; nome: string; preco: number; foto: string; unidades: number }[];
};

export function toClientDashboard(d: ApiClientDashboard): ClientDashboard {
  return {
    ...toClientProfile(d),
    pendingReviews: {
      count: d.avaliacoes_pendentes.quantidade,
      points: d.avaliacoes_pendentes.pontos,
      lastPurchase: d.avaliacoes_pendentes.ultima_compra,
    },
    levelProgress: d.progresso_nivel,
    expiring: { days: d.a_vencer.dias, points: d.a_vencer.pontos, nextDate: d.a_vencer.proxima_data },
    savings: d.economia,
    topProducts: d.mais_comprados.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco, photo: p.foto || null, units: p.unidades })),
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

// LGPD: apaga os dados pessoais e o login do cliente (o backend confere a senha) e encerra a sessão.
export async function deleteAccount(password: string): Promise<void> {
  await request("/api/conta/excluir/", { method: "POST", body: { senha: password } });
}

// Numeração, nascimento e autorização de contato. Devolve o painel já atualizado.
export async function updateProfile(profile: ProfileUpdate): Promise<ClientDashboard> {
  return toClientDashboard(
    await request<ApiClientDashboard>("/api/conta/perfil/", {
      method: "POST",
      body: { numeracao: profile.shoeSize, nascimento: profile.birthDate, aceita_contato: profile.acceptsContact },
    }),
  );
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
      itens: purchase.items.map(itemParaApi),
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

// ---------- Avaliações (produtos comprados que o cliente avalia para ganhar pontos) ----------

export type ApiReviews = {
  pontos_por_avaliacao: number;
  comentario_minimo: number;
  para_avaliar: { sku: string; nome: string; preco: number; foto: string; ultima_compra: string }[];
  avaliadas: { sku: string; nome: string; foto: string; nota: number; comentario: string; data: string; pontos: number }[];
};

function toReviews(d: ApiReviews): Reviews {
  return {
    pointsPerReview: d.pontos_por_avaliacao,
    minComment: d.comentario_minimo,
    pending: d.para_avaliar.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco, photo: p.foto || null, lastPurchase: p.ultima_compra })),
    done: d.avaliadas.map((a) => ({
      sku: a.sku,
      name: a.nome,
      photo: a.foto || null,
      rating: a.nota,
      comment: a.comentario,
      date: a.data,
      points: a.pontos,
    })),
  };
}

export async function fetchReviews(): Promise<Reviews> {
  return toReviews(await request<ApiReviews>("/api/conta/avaliacoes/"));
}

// Devolve a lista já atualizada (o produto sai de "para avaliar" e entra em "avaliadas").
export async function sendReview(sku: string, rating: number, comment: string): Promise<Reviews> {
  return toReviews(
    await request<ApiReviews>("/api/conta/avaliacoes/", { method: "POST", body: { sku, nota: rating, comentario: comment } }),
  );
}
