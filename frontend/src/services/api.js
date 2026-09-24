import { REGISTER_CODE } from "../config";

// Feito com IA: faz a requisição e, em caso de erro, lança um Error com a mensagem que o backend mandou.
// As funções abaixo convertem os nomes da API (português) para os nomes usados nas telas.
async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Sem conexão com o servidor.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.erro || `Erro ${response.status} no servidor.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function toClient(data) {
  return {
    cpf: data.cpf,
    name: data.nome,
    level: data.nivel_nome,
    bonusPercent: data.bonus_percentual,
    points: data.saldo_pontos,
    redeemablePoints: data.pontos_resgataveis,
  };
}

export async function fetchProducts() {
  const data = await request("/api/produtos/");
  return data.produtos.map((p) => ({ sku: p.sku, name: p.nome, price: p.preco }));
}

export async function fetchClient(cpf) {
  try {
    return toClient(await request(`/api/clientes/${cpf}/`));
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function registerClient(cpf, name) {
  const data = await request("/api/clientes/", {
    method: "POST",
    body: { cpf, nome: name, caixa: REGISTER_CODE },
  });
  return toClient(data);
}

export async function sendSale(sale) {
  const data = await request("/api/vendas/", {
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
  });
  return {
    total: data.valor_pago,
    discount: data.desconto,
    pointsEarned: data.pontos_ganhos,
    balance: data.saldo_atual,
  };
}

export async function fetchActions() {
  const data = await request("/api/acoes/");
  return data.acoes.map((a) => ({
    type: a.tipo,
    title: a.titulo,
    description: a.descricao,
    message: a.mensagem,
    clients: a.clientes.map((c) => ({ name: c.nome, cpf: c.cpf, detail: c.detalhe })),
  }));
}

export async function fetchDashboard(period) {
  const query = period ? `?inicio=${period.start}&fim=${period.end}` : "";
  const data = await request(`/api/dashboard/${query}`);
  const { pontos, evolucao } = data;

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
    },
    ranking: data.ranking.map((r) => ({
      position: r.posicao,
      name: r.nome,
      cpf: r.cpf,
      level: r.nivel_nome,
      earned: r.acumulado,
      balance: r.saldo,
    })),
    monthly: evolucao.labels.map((month, i) => ({
      month,
      earned: evolucao.acumulados[i],
      redeemed: evolucao.resgatados[i],
      expired: evolucao.expirados[i],
    })),
  };
}
