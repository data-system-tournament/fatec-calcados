import { REGISTER_CODE } from "../../config";
import type { CartItem, Sale, SaleDetail, SaleList } from "../../types";
import { queryString, request } from "./http";

// ---------- Registro de venda no PDV ----------

// Item do carrinho no formato da API (PDV e loja online). `?? null`: vendas guardadas na fila offline antes
// do estoque por numeração não têm `size`.
export function itemParaApi(item: CartItem) {
  return { sku: item.sku, quantidade: item.quantity, numeracao: item.size ?? null };
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
        itens: sale.items.map(itemParaApi),
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

// ---------- Tela de Vendas (lista e detalhe) ----------

export type SaleQuery = { start?: string; end?: string; register?: string; payment?: string; page?: number };

export type ApiSaleBase = {
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

export type ApiSaleList = {
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
};

export async function fetchSales({ start, end, register, payment, page }: SaleQuery): Promise<SaleList> {
  const data = await request<ApiSaleList>(
    `/api/vendas/${queryString({ inicio: start, fim: end, caixa: register, pagamento: payment, pagina: page })}`,
  );
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

// A compra da área do cliente (conta.ts) usa o mesmo formato de detalhe.
export type ApiSaleDetail = ApiSaleBase & {
  loja: string;
  nivel_na_compra_nome: string;
  itens: { sku: string; nome: string; quantidade: number; numeracao: number | null; preco_unitario: number; subtotal: number }[];
};

export function toSaleDetail(d: ApiSaleDetail): SaleDetail {
  return {
    ...toSaleBase(d),
    store: d.loja,
    levelAtPurchase: d.nivel_na_compra_nome,
    items: d.itens.map((i) => ({
      name: i.nome,
      sku: i.sku,
      quantity: i.quantidade,
      size: i.numeracao,
      unitPrice: i.preco_unitario,
      subtotal: i.subtotal,
    })),
  };
}

export async function fetchSaleDetail(id: string): Promise<SaleDetail> {
  return toSaleDetail(await request<ApiSaleDetail>(`/api/vendas/${id}/`));
}
