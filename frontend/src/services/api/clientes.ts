import { REGISTER_CODE } from "../../config";
import type { Client, ClientList, ClientProfile } from "../../types";
import { ApiError, queryString, request } from "./http";

// ---------- Cliente no PDV (busca por CPF e cadastro no caixa) ----------

export type ApiClient = {
  cpf: string;
  nome: string;
  nivel_nome: string;
  bonus_percentual: number;
  saldo_pontos: number;
  pontos_resgataveis: number;
  valor_resgatavel: number;
};

function toClient(data: ApiClient): Client {
  return {
    cpf: data.cpf,
    name: data.nome,
    level: data.nivel_nome,
    bonusPercent: data.bonus_percentual,
    points: data.saldo_pontos,
    redeemablePoints: data.pontos_resgataveis,
    redeemableValue: data.valor_resgatavel,
  };
}

export async function fetchClient(cpf: string): Promise<Client | null> {
  try {
    return toClient(await request<ApiClient>(`/api/clientes/${cpf}/`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function registerClient(cpf: string, name: string): Promise<Client> {
  const data = await request<ApiClient>("/api/clientes/", {
    method: "POST",
    body: { cpf, nome: name, caixa: REGISTER_CODE },
  });
  return toClient(data);
}

// ---------- Tela de Clientes (lista e perfil) ----------

// order: "saldo" (padrão do backend, maior saldo primeiro) ou "nome" (A–Z).
export type ClientQuery = { search?: string; level?: string; page?: number; order?: "saldo" | "nome" };

export type ApiClientList = {
  total: number;
  pagina: number;
  paginas: number;
  clientes: {
    id: number;
    nome: string;
    cpf: string;
    nivel_nome: string;
    saldo_pontos: number;
    compras: number;
    ultima_compra: string | null;
  }[];
};

export async function fetchClients({ search, level, page, order }: ClientQuery): Promise<ClientList> {
  const data = await request<ApiClientList>(`/api/clientes/${queryString({ busca: search, nivel: level, pagina: page, ordem: order })}`);
  return {
    total: data.total,
    page: data.pagina,
    pages: data.paginas,
    clients: data.clientes.map((c) => ({
      id: c.id,
      name: c.nome,
      cpf: c.cpf,
      level: c.nivel_nome,
      points: c.saldo_pontos,
      purchases: c.compras,
      lastPurchase: c.ultima_compra,
    })),
  };
}

// O painel da área do cliente (conta.ts) estende este formato.
export type ApiClientProfile = {
  id: number;
  nome: string;
  cpf: string;
  cadastrado_em: string;
  loja_cadastro: string | null;
  numeracao: number | null;
  nascimento: string | null;
  contato_autorizado_em: string | null;
  nivel_nome: string;
  bonus_percentual: number;
  pontos_12m: number;
  proximo_nivel: { nome: string; faltam: number } | null;
  saldo_pontos: number;
  pontos_resgataveis: number;
  valor_resgatavel: number;
  total_compras: number;
  total_gasto: number;
  total_pontos_ganhos: number;
  total_pontos_resgatados: number;
  lotes: { pontos: number; expira_em: string }[];
  compras: {
    id: string;
    data: string;
    caixa: string | null;
    forma_pagamento: string;
    valor_pago: number;
    desconto: number;
    pontos_ganhos: number;
    pontos_resgatados: number;
  }[];
  movimentos: { data: string; tipo: "ACUMULO" | "RESGATE" | "EXPIRACAO"; pontos: number; avaliacao: string | null }[];
};

export async function fetchClientProfile(id: number): Promise<ClientProfile> {
  return toClientProfile(await request<ApiClientProfile>(`/api/clientes/${id}/perfil/`));
}

export function toClientProfile(d: ApiClientProfile): ClientProfile {
  return {
    id: d.id,
    name: d.nome,
    cpf: d.cpf,
    registeredAt: d.cadastrado_em,
    registeredStore: d.loja_cadastro,
    shoeSize: d.numeracao,
    birthDate: d.nascimento,
    contactConsentAt: d.contato_autorizado_em,
    level: d.nivel_nome,
    bonusPercent: d.bonus_percentual,
    points12m: d.pontos_12m,
    nextLevel: d.proximo_nivel ? { name: d.proximo_nivel.nome, missing: d.proximo_nivel.faltam } : null,
    points: d.saldo_pontos,
    redeemablePoints: d.pontos_resgataveis,
    redeemableValue: d.valor_resgatavel,
    totalPurchases: d.total_compras,
    totalSpent: d.total_gasto,
    totalEarned: d.total_pontos_ganhos,
    totalRedeemed: d.total_pontos_resgatados,
    lots: d.lotes.map((l) => ({ points: l.pontos, expiresAt: l.expira_em })),
    purchases: d.compras.map((c) => ({
      id: c.id,
      date: c.data,
      register: c.caixa,
      payment: c.forma_pagamento,
      paid: c.valor_pago,
      discount: c.desconto,
      pointsEarned: c.pontos_ganhos,
      pointsRedeemed: c.pontos_resgatados,
    })),
    movements: d.movimentos.map((m) => ({ date: m.data, type: m.tipo, points: m.pontos, review: m.avaliacao })),
  };
}
