import { REGISTER_CODE } from "../config";
import type {
  Action, ClientDashboard, ClientList, ClientProfile, Client, DashboardData, LevelRedemption, Period, Product, RankingRow,
  OnlinePurchase, OnlinePurchaseResult, Sale, SaleDetail, SaleList, SalesGroup,
} from "../types";

// Feito com IA: este é o único arquivo que fala com a API. Ele faz a requisição (e, em caso de erro,
// lança um Error com a mensagem que o backend mandou) e converte os nomes da API (português) para os
// nomes usados nas telas. Cada `Api...` abaixo descreve o JSON do backend; cada função devolve o tipo de types.ts.

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = { method?: string; body?: unknown };

// As rotas /api/conta/ usam a sessão do Django, que exige o token CSRF nos POST. O Django manda o
// token no cookie `csrftoken` (no GET /api/conta/) e espera recebê-lo de volta neste cabeçalho.
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// Em /login e /cadastro ainda não houve nenhum GET /api/conta/, então o cookie pode não existir:
// busca antes (a resposta 401 não importa, só o cookie que vem junto).
async function ensureCsrfCookie() {
  if (!csrfToken()) await fetch("/api/conta/").catch(() => {});
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.erro || `Erro ${response.status} no servidor.`, response.status);
  }
  return data as T;
}

// Mensagem de um erro capturado com `catch (e)` (que chega como `unknown`).
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Monta "?a=1&b=2" sem os parâmetros vazios.
function queryString(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ---------- Produtos, clientes do PDV e vendas ----------

type ApiClient = {
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

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<{ produtos: { sku: string; nome: string; preco: number }[] }>("/api/produtos/");
  return data.produtos.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco }));
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

export async function sendSale(sale: Sale) {
  const data = await request<{ valor_pago: number; desconto: number; pontos_ganhos: number; saldo_atual: number | null }>(
    "/api/vendas/",
    {
      method: "POST",
      body: {
        id: sale.id,
        caixa: REGISTER_CODE,
        cpf: sale.cpf,
        itens: sale.items.map((item) => ({ sku: item.sku, quantidade: item.quantity })),
        forma_pagamento: sale.payment,
        pontos_resgate: sale.pointsToRedeem,
        data: sale.date,
      },
    },
  );
  return {
    total: data.valor_pago,
    discount: data.desconto,
    pointsEarned: data.pontos_ganhos,
    balance: data.saldo_atual,
  };
}

// ---------- Ações ----------

export async function fetchActions(): Promise<Action[]> {
  const data = await request<{
    acoes: {
      tipo: string;
      titulo: string;
      descricao: string;
      mensagem: string;
      clientes: { nome: string; cpf: string; detalhe: string }[];
    }[];
  }>("/api/acoes/");
  return data.acoes.map((a) => ({
    type: a.tipo,
    title: a.titulo,
    description: a.descricao,
    message: a.mensagem,
    clients: a.clientes.map((c) => ({ name: c.nome, cpf: c.cpf, detail: c.detalhe })),
  }));
}

// ---------- Dashboard ----------

type ApiSalesGroup = { nome: string; quantidade: number; faturamento: number; percentual: number };

function toSalesGroup(g: ApiSalesGroup): SalesGroup {
  return { name: g.nome, count: g.quantidade, revenue: g.faturamento, percent: g.percentual };
}

type ApiDashboard = {
  inicio: string;
  fim: string;
  atalhos: { rotulo: string; inicio: string; fim: string }[];
  base: { total: number; niveis: { nome: string; bonus: number; clientes: number; percentual: number }[] };
  pontos: {
    acumulados: number;
    resgatados: number;
    expirados: number;
    taxa_resgate: number;
    custo: number;
    custo_sobre_faturamento: number;
    compras: number;
    em_aberto: number;
    em_aberto_reais: number;
    a_vencer: { dias: number; pontos: number; reais: number };
  };
  vendas: {
    quantidade: number;
    faturamento: number;
    ticket_medio: number;
    com_cpf: number;
    percentual_com_cpf: number;
    por_caixa: ApiSalesGroup[];
    por_pagamento: ApiSalesGroup[];
    mais_vendidos: { sku: string; nome: string; unidades: number; receita: number }[];
  };
  resgate_por_nivel: {
    codigo: string;
    nome: string;
    compras: number;
    compras_com_resgate: number;
    taxa_resgate: number;
    pontos_resgatados: number;
    pontos_ganhos: number;
  }[];
  ranking: {
    posicao: number;
    id: number;
    nome: string;
    cpf: string;
    nivel_nome: string;
    acumulado: number;
    saldo: number;
  }[];
  evolucao: { labels: string[]; acumulados: number[]; resgatados: number[]; expirados: number[] };
};

export async function fetchDashboard(period?: Period | null): Promise<DashboardData> {
  const query = period ? queryString({ inicio: period.start, fim: period.end }) : "";
  const data = await request<ApiDashboard>(`/api/dashboard/${query}`);
  const { pontos, vendas, evolucao } = data;

  const ranking: RankingRow[] = data.ranking.map((r) => ({
    position: r.posicao,
    id: r.id,
    name: r.nome,
    cpf: r.cpf,
    level: r.nivel_nome,
    earned: r.acumulado,
    balance: r.saldo,
  }));
  const redemptionByLevel: LevelRedemption[] = data.resgate_por_nivel.map((n) => ({
    code: n.codigo,
    name: n.nome,
    purchases: n.compras,
    purchasesWithRedemption: n.compras_com_resgate,
    redeemRate: n.taxa_resgate,
    pointsRedeemed: n.pontos_resgatados,
    pointsEarned: n.pontos_ganhos,
  }));

  return {
    start: data.inicio,
    end: data.fim,
    shortcuts: data.atalhos.map((a) => ({ label: a.rotulo, start: a.inicio, end: a.fim })),
    totalClients: data.base.total,
    levels: data.base.niveis.map((n) => ({
      name: n.nome,
      bonus: n.bonus,
      clients: n.clientes,
      percent: n.percentual,
    })),
    points: {
      earned: pontos.acumulados,
      redeemed: pontos.resgatados,
      expired: pontos.expirados,
      redeemRate: pontos.taxa_resgate,
      cost: pontos.custo,
      costPercent: pontos.custo_sobre_faturamento,
      purchases: pontos.compras,
      openBalance: pontos.em_aberto,
      openBalanceValue: pontos.em_aberto_reais,
      expiring: { days: pontos.a_vencer.dias, points: pontos.a_vencer.pontos, value: pontos.a_vencer.reais },
    },
    sales: {
      count: vendas.quantidade,
      revenue: vendas.faturamento,
      averageTicket: vendas.ticket_medio,
      withCpf: vendas.com_cpf,
      withCpfPercent: vendas.percentual_com_cpf,
      byRegister: vendas.por_caixa.map(toSalesGroup),
      byPayment: vendas.por_pagamento.map(toSalesGroup),
      topProducts: vendas.mais_vendidos.map((p) => ({ sku: p.sku, name: p.nome, units: p.unidades, revenue: p.receita })),
    },
    redemptionByLevel,
    ranking,
    monthly: evolucao.labels.map((month, i) => ({
      month,
      earned: evolucao.acumulados[i],
      redeemed: evolucao.resgatados[i],
      expired: evolucao.expirados[i],
    })),
  };
}

// ---------- Clientes (tela de Clientes) ----------

export type ClientQuery = { search?: string; level?: string; page?: number };

export async function fetchClients({ search, level, page }: ClientQuery): Promise<ClientList> {
  const data = await request<{
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
  }>(`/api/clientes/${queryString({ busca: search, nivel: level, pagina: page })}`);
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

type ApiClientProfile = {
  id: number;
  nome: string;
  cpf: string;
  cadastrado_em: string;
  loja_cadastro: string | null;
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
  movimentos: { data: string; tipo: "ACUMULO" | "RESGATE" | "EXPIRACAO"; pontos: number }[];
};

export async function fetchClientProfile(id: number): Promise<ClientProfile> {
  return toClientProfile(await request<ApiClientProfile>(`/api/clientes/${id}/perfil/`));
}

function toClientProfile(d: ApiClientProfile): ClientProfile {
  return {
    id: d.id,
    name: d.nome,
    cpf: d.cpf,
    registeredAt: d.cadastrado_em,
    registeredStore: d.loja_cadastro,
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
    movements: d.movimentos.map((m) => ({ date: m.data, type: m.tipo, points: m.pontos })),
  };
}

// ---------- Vendas (tela de Vendas) ----------

export type SaleQuery = { start?: string; end?: string; register?: string; payment?: string; page?: number };

type ApiSaleBase = {
  id: string;
  data: string;
  cliente: { id: number; nome: string } | null;
  caixa: string | null;
  forma_pagamento: string;
  valor_bruto: number;
  desconto: number;
  valor_pago: number;
  pontos_ganhos: number;
  pontos_resgatados: number;
};

function toSaleBase(v: ApiSaleBase) {
  return {
    id: v.id,
    date: v.data,
    client: v.cliente ? { id: v.cliente.id, name: v.cliente.nome } : null,
    register: v.caixa,
    payment: v.forma_pagamento,
    gross: v.valor_bruto,
    discount: v.desconto,
    paid: v.valor_pago,
    pointsEarned: v.pontos_ganhos,
    pointsRedeemed: v.pontos_resgatados,
  };
}

export async function fetchSales({ start, end, register, payment, page }: SaleQuery): Promise<SaleList> {
  const data = await request<{
    total: number;
    pagina: number;
    paginas: number;
    faturamento: number;
    desconto: number;
    filtros: {
      caixas: { codigo: string; nome: string }[];
      formas_pagamento: { codigo: string; nome: string }[];
    };
    vendas: (ApiSaleBase & { itens_qtd: number })[];
  }>(`/api/vendas/${queryString({ inicio: start, fim: end, caixa: register, pagamento: payment, pagina: page })}`);
  return {
    total: data.total,
    page: data.pagina,
    pages: data.paginas,
    revenue: data.faturamento,
    discount: data.desconto,
    filters: {
      registers: data.filtros.caixas.map((c) => ({ code: c.codigo, name: c.nome })),
      payments: data.filtros.formas_pagamento.map((f) => ({ code: f.codigo, name: f.nome })),
    },
    sales: data.vendas.map((v) => ({ ...toSaleBase(v), itemCount: v.itens_qtd })),
  };
}

type ApiSaleDetail = ApiSaleBase & {
  loja: string;
  nivel_na_compra_nome: string;
  itens: { sku: string; nome: string; quantidade: number; preco_unitario: number; subtotal: number }[];
};

function toSaleDetail(d: ApiSaleDetail): SaleDetail {
  return {
    ...toSaleBase(d),
    store: d.loja,
    levelAtPurchase: d.nivel_na_compra_nome,
    items: d.itens.map((i) => ({
      name: i.nome,
      sku: i.sku,
      quantity: i.quantidade,
      unitPrice: i.preco_unitario,
      subtotal: i.subtotal,
    })),
  };
}

export async function fetchSaleDetail(id: string): Promise<SaleDetail> {
  return toSaleDetail(await request<ApiSaleDetail>(`/api/vendas/${id}/`));
}

// ---------- Área do cliente (/api/conta/, com sessão) ----------

type ApiClientDashboard = ApiClientProfile & {
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
