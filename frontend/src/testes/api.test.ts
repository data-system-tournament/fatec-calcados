import { afterEach, describe, expect, it, vi } from "vitest";
import { REGISTER_CODE } from "../config";
import {
  buyOnline, deleteAccount, fetchAccount, fetchReviews, fetchStoreReviews, fetchActions, fetchClient, fetchClientProfile, fetchClients, fetchDashboard,
  fetchProductDetail, fetchProducts, fetchSaleDetail, fetchSales, fetchStaff, fetchStock, registerClient, sendReview, sendSale, signIn,
  staffSignIn, staffSignOut, updateProfile, updateStock,
} from "../services/api";
import type { Sale } from "../types";
import { chamada, simularApi } from "./apiFalsa";
import { acoesApi } from "./dados/acoes";
import { avaliacoesDaLojaApi } from "./dados/avaliacoes";
import { clientePdvApi, listaDeClientesApi, perfilDoClienteApi } from "./dados/clientes";
import { avaliacoesApi, painelDoClienteApi } from "./dados/conta";
import { dashboardApi } from "./dados/dashboard";
import { estoqueApi } from "./dados/estoque";
import { detalheDoProdutoApi, produtosApi } from "./dados/produtos";
import { detalheDaVendaApi, listaDeVendasApi } from "./dados/vendas";

// Testa a tradução da API (português) para os tipos das telas, com o fetch simulado e os dados de testes/dados/.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requisição e erros", () => {
  it("usa a mensagem de erro que o backend manda", async () => {
    simularApi([{ status: 400, corpo: { erro: "Saldo de pontos insuficiente." } }]);
    await expect(fetchProducts()).rejects.toThrow("Saldo de pontos insuficiente.");
  });

  it("sem mensagem do backend, mostra o status", async () => {
    simularApi([{ status: 500 }]);
    await expect(fetchProducts()).rejects.toThrow("Erro 500 no servidor.");
  });

  it("avisa quando não há conexão", async () => {
    simularApi([new TypeError("Failed to fetch")]);
    await expect(fetchProducts()).rejects.toThrow("Sem conexão com o servidor.");
  });

  it("manda o token CSRF do cookie no cabeçalho", async () => {
    const fetch = simularApi([{ corpo: produtosApi }]);
    await fetchProducts();
    expect(chamada(fetch).headers?.["X-CSRFToken"]).toBe("token-de-teste");
  });
});

describe("produtos e ações", () => {
  it("converte os produtos com estoque, numerações e nota", async () => {
    simularApi([{ corpo: produtosApi }]);
    expect(await fetchProducts()).toEqual([
      {
        sku: "TEN-001", name: "Tênis Corrida Leve", price: 459.7, photo: "https://images.unsplash.com/photo-1?w=600",
        usesSizes: true, stock: 7, stockStatus: "ACABANDO",
        sizes: [{ size: 39, quantity: 7, status: "OK" }, { size: 40, quantity: 0, status: "ESGOTADO" }],
        rating: 4.5, reviewCount: 2,
      },
      {
        sku: "MEI-002", name: "Meia Esportiva", price: 39.95, photo: null,
        usesSizes: false, stock: 12, stockStatus: "OK", sizes: [], rating: null, reviewCount: 0,
      },
    ]);
  });

  it("converte a página do produto com descrição e avaliações", async () => {
    const fetch = simularApi([{ corpo: detalheDoProdutoApi }]);
    const produto = await fetchProductDetail("TEN-001");
    expect(chamada(fetch).url).toBe("/api/produtos/TEN-001/");
    expect(produto).toMatchObject({ sku: "TEN-001", description: "Tênis leve para correr.", rating: 4.5 });
    expect(produto.byRating[0]).toEqual({ rating: 5, count: 1 });
    expect(produto.comments).toEqual([
      { id: 9, date: "2026-09-10T10:00:00-03:00", name: "Ana", rating: 5, comment: "Muito confortável, uso todo dia." },
    ]);
  });

  it("converte as listas de ações", async () => {
    simularApi([{ corpo: acoesApi }]);
    const [acao] = await fetchActions();
    expect(acao.type).toBe("pontos_a_vencer");
    expect(acao.clients).toEqual([{ name: "Ana Souza", cpf: "***.982.247-**", detail: "713 pts até 02/11/2026" }]);
  });
});

describe("clientes", () => {
  it("busca o cliente do PDV pelo CPF", async () => {
    const fetch = simularApi([{ corpo: clientePdvApi }]);
    const cliente = await fetchClient("52998224725");
    expect(chamada(fetch).url).toBe("/api/clientes/52998224725/");
    expect(cliente).toEqual({
      cpf: "52998224725",
      name: "Ana Souza",
      level: "Prata",
      bonusPercent: 10,
      points: 1250,
      redeemablePoints: 1200,
      redeemableValue: 60,
    });
  });

  it("CPF sem cadastro (404) vira null em vez de erro", async () => {
    simularApi([{ status: 404, corpo: { erro: "Cliente não encontrado." } }]);
    expect(await fetchClient("11144477735")).toBeNull();
  });

  it("cadastra o cliente informando o caixa deste PDV", async () => {
    const fetch = simularApi([{ status: 201, corpo: clientePdvApi }]);
    await registerClient("52998224725", "Ana Souza");
    expect(chamada(fetch)).toMatchObject({
      url: "/api/clientes/",
      method: "POST",
      body: { cpf: "52998224725", nome: "Ana Souza", caixa: REGISTER_CODE },
    });
  });

  it("a lista só manda os filtros preenchidos", async () => {
    const fetch = simularApi([{ corpo: listaDeClientesApi }]);
    const lista = await fetchClients({ search: "ana", level: "", page: 2 });
    expect(chamada(fetch).url).toBe("/api/clientes/?busca=ana&pagina=2");
    // Sem ordem, o backend usa o saldo; com ordem, ela vai na URL.
    const porNome = simularApi([{ corpo: listaDeClientesApi }]);
    await fetchClients({ order: "nome" });
    expect(chamada(porNome).url).toBe("/api/clientes/?ordem=nome");
    expect(lista.clients[1]).toEqual({
      id: 2,
      name: "Bruno Lima",
      cpf: "***.444.777-**",
      level: "Bronze",
      points: 0,
      purchases: 0,
      lastPurchase: null,
    });
  });

  it("converte o perfil com lotes, compras e movimentos", async () => {
    simularApi([{ corpo: perfilDoClienteApi }]);
    const perfil = await fetchClientProfile(1);
    expect(perfil.nextLevel).toEqual({ name: "Ouro", missing: 2730 });
    expect(perfil.lots).toEqual([
      { points: 713, expiresAt: "2026-11-02" },
      { points: 537, expiresAt: "2027-09-20" },
      { points: 20, expiresAt: "2027-09-22" },
    ]);
    expect(perfil.purchases[0]).toMatchObject({ paid: 489.6, pointsEarned: 537, pointsRedeemed: 1000 });
    expect(perfil.movements.map((m) => m.type)).toEqual(["ACUMULO", "RESGATE", "ACUMULO"]);
    // O acúmulo de uma avaliação diz de qual produto veio; o de compra, não.
    expect(perfil.movements.map((m) => m.review)).toEqual(["Tênis Corrida Leve", null, null]);
  });
});

describe("vendas", () => {
  const venda: Sale = {
    id: detalheDaVendaApi.id,
    cpf: "52998224725",
    clientName: "Ana Souza",
    items: [{ sku: "TEN-001", quantity: 1, size: 40 }, { sku: "MEI-002", quantity: 2, size: null }],
    payment: "PIX",
    pointsToRedeem: 1000,
    date: "2026-09-20T15:10:00-03:00",
    total: 489.6,
    points: 537,
    itemCount: 3,
    time: "15:10",
  };

  it("envia só SKU, quantidade e numeração (o preço vem do banco) e converte o resultado", async () => {
    const fetch = simularApi([
      { status: 201, corpo: { valor_pago: 489.6, desconto: 50, pontos_ganhos: 537, saldo_atual: 787 } },
    ]);
    const resultado = await sendSale(venda);
    expect(chamada(fetch).body).toEqual({
      id: venda.id,
      caixa: REGISTER_CODE,
      cpf: "52998224725",
      itens: [{ sku: "TEN-001", quantidade: 1, numeracao: 40 }, { sku: "MEI-002", quantidade: 2, numeracao: null }],
      forma_pagamento: "PIX",
      pontos_resgate: 1000,
      data: venda.date,
    });
    expect(resultado).toEqual({ total: 489.6, discount: 50, pointsEarned: 537, balance: 787 });
  });

  it("venda da fila offline de antes da numeração vai com numeração null", async () => {
    const fetch = simularApi([
      { status: 201, corpo: { valor_pago: 39.95, desconto: 0, pontos_ganhos: 0, saldo_atual: null } },
    ]);
    const antiga = { ...venda, items: [{ sku: "MEI-002", quantity: 1 }] } as unknown as Sale;
    await sendSale(antiga);
    expect(chamada(fetch).body).toMatchObject({ itens: [{ sku: "MEI-002", quantidade: 1, numeracao: null }] });
  });

  it("converte a lista com filtros e venda sem cliente", async () => {
    const fetch = simularApi([{ corpo: listaDeVendasApi }]);
    const lista = await fetchSales({ start: "2026-09-01", end: "2026-09-30", payment: "PIX" });
    expect(chamada(fetch).url).toBe("/api/vendas/?inicio=2026-09-01&fim=2026-09-30&pagamento=PIX");
    expect(lista.filters.payments).toEqual([{ code: "PIX", name: "Pix" }, { code: "DINHEIRO", name: "Dinheiro" }]);
    expect(lista.sales[0]).toMatchObject({ client: { id: 1, name: "Ana Souza" }, itemCount: 3, gross: 539.6 });
    expect(lista.sales[1].client).toBeNull();
  });

  it("converte o detalhe com os itens", async () => {
    simularApi([{ corpo: detalheDaVendaApi }]);
    const detalhe = await fetchSaleDetail(detalheDaVendaApi.id);
    expect(detalhe).toMatchObject({ store: "Araras", levelAtPurchase: "Prata", paid: 489.6, discount: 50 });
    expect(detalhe.items[0].size).toBe(40);
    expect(detalhe.items[1]).toEqual({ name: "Meia Esportiva", sku: "MEI-002", quantity: 2, size: null, unitPrice: 39.95, subtotal: 79.9 });
  });
});

describe("dashboard", () => {
  it("manda o período na URL e junta a evolução mês a mês", async () => {
    const fetch = simularApi([{ corpo: dashboardApi }]);
    const dados = await fetchDashboard({ start: "2026-07-01", end: "2026-09-30" });
    expect(chamada(fetch).url).toBe("/api/dashboard/?inicio=2026-07-01&fim=2026-09-30");
    expect(dados.monthly[2]).toEqual({ month: "set/26", earned: 537, redeemed: 1000, expired: 0 });
    expect(dados.points.expiring).toEqual({ days: 60, points: 713, value: 35 });
    expect(dados.sales.byPayment[0]).toEqual({ name: "Pix", count: 1, revenue: 489.6, percent: 71 });
    expect(dados.ranking[0]).toMatchObject({ position: 1, earned: 2250, balance: 1250 });
  });

  it("sem período, usa o padrão do backend", async () => {
    const fetch = simularApi([{ corpo: dashboardApi }]);
    await fetchDashboard(null);
    expect(chamada(fetch).url).toBe("/api/dashboard/");
  });
});

describe("área do cliente", () => {
  it("sem sessão (401), o painel vem null", async () => {
    simularApi([{ status: 401, corpo: { erro: "Faça login." } }]);
    expect(await fetchAccount()).toBeNull();
  });

  it("converte o painel: perfil mais progresso, pontos a vencer e economia", async () => {
    simularApi([{ corpo: painelDoClienteApi }]);
    const painel = await fetchAccount();
    expect(painel).toMatchObject({ name: "Ana Souza", points: 1270, levelProgress: 32, savings: 50 });
    expect(painel?.topProducts).toEqual([{ sku: "TEN-001", name: "Tênis Corrida Leve", price: 459.7, photo: "https://images.unsplash.com/photo-1?w=600", units: 1 }]);
    expect(painel?.expiring).toEqual({ days: 60, points: 713, nextDate: "2026-11-02" });
    expect(painel?.pendingReviews).toEqual({ count: 1, points: 20, lastPurchase: "2026-09-20T15:10:00-03:00" });
    expect(painel).toMatchObject({ shoeSize: 37, birthDate: "1992-10-14", contactConsentAt: "2026-09-01T18:30:00-03:00" });
  });

  it("salva numeração, nascimento e autorização com os nomes da API", async () => {
    const fetch = simularApi([{ corpo: painelDoClienteApi }]);
    const painel = await updateProfile({ shoeSize: 37, birthDate: "1992-10-14", acceptsContact: true });
    expect(chamada(fetch)).toMatchObject({
      url: "/api/conta/perfil/",
      method: "POST",
      body: { numeracao: 37, nascimento: "1992-10-14", aceita_contato: true },
    });
    expect(painel.shoeSize).toBe(37);
  });

  it("sem cookie CSRF, o login busca o cookie antes de entrar", async () => {
    const fetch = simularApi([{ status: 401 }, { corpo: painelDoClienteApi }], "");
    await signIn("52998224725", "senha-secreta");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(chamada(fetch, 0).url).toBe("/api/conta/");
    expect(chamada(fetch, 1)).toMatchObject({
      url: "/api/conta/entrar/",
      method: "POST",
      body: { cpf: "52998224725", senha: "senha-secreta" },
    });
  });

  it("a compra online não manda CPF (vem da sessão)", async () => {
    const fetch = simularApi([
      { status: 201, corpo: { id: "c1", valor_pago: 459.7, desconto: 0, pontos_ganhos: 505, saldo_atual: 1755 } },
    ]);
    const resultado = await buyOnline({ id: "c1", items: [{ sku: "TEN-001", quantity: 1, size: 39 }], payment: "PIX", pointsToRedeem: 0 });
    expect(chamada(fetch).body).not.toHaveProperty("cpf");
    expect(chamada(fetch).body).toMatchObject({ itens: [{ sku: "TEN-001", quantidade: 1, numeracao: 39 }] });
    expect(resultado).toEqual({ id: "c1", total: 459.7, discount: 0, pointsEarned: 505, balance: 1755 });
  });
});

describe("avaliações", () => {
  it("converte o que falta avaliar, o que já foi avaliado e as regras", async () => {
    simularApi([{ corpo: avaliacoesApi }]);
    const avaliacoes = await fetchReviews();
    expect(avaliacoes).toMatchObject({ pointsPerReview: 20, minComment: 20 });
    expect(avaliacoes.pending).toEqual([
      { sku: "MEI-002", name: "Meia Esportiva", price: 39.95, photo: null, lastPurchase: "2026-09-20T15:10:00-03:00" },
    ]);
    expect(avaliacoes.done[0]).toMatchObject({ name: "Tênis Corrida Leve", photo: "https://images.unsplash.com/photo-1?w=600", rating: 5, points: 20 });
  });

  it("envia SKU, nota e comentário com os nomes da API", async () => {
    const fetch = simularApi([{ status: 201, corpo: avaliacoesApi }]);
    await sendReview("MEI-002", 4, "Boa meia, não esquenta o pé.");
    expect(chamada(fetch)).toMatchObject({
      url: "/api/conta/avaliacoes/",
      method: "POST",
      body: { sku: "MEI-002", nota: 4, comentario: "Boa meia, não esquenta o pé." },
    });
  });

  it("recusa do backend (ex.: já avaliou) chega como erro com a mensagem", async () => {
    simularApi([{ status: 400, corpo: { erro: "Você já avaliou este produto." } }]);
    await expect(sendReview("TEN-001", 5, "Muito confortável, uso todo dia.")).rejects.toThrow("Você já avaliou este produto.");
  });
});

describe("avaliações na área da loja", () => {
  it("manda os filtros e converte resumo, notas, produtos e a lista", async () => {
    const fetch = simularApi([{ corpo: avaliacoesDaLojaApi }]);
    const dados = await fetchStoreReviews({ product: "MEI-002", rating: "", page: 1 });
    expect(chamada(fetch).url).toBe("/api/avaliacoes/?produto=MEI-002&pagina=1");
    expect(dados.summary).toEqual({ total: 3, average: 3.7, points: 60 });
    expect(dados.byRating[0]).toEqual({ rating: 5, count: 1 });
    expect(dados.byProduct[0]).toEqual({ sku: "TEN-001", name: "Tênis Corrida Leve", count: 2, average: 4.5 });
    expect(dados.reviews[0]).toMatchObject({ client: { id: 1, name: "Ana Souza" }, rating: 2 });
  });
});

describe("estoque", () => {
  it("manda o filtro de situação e converte resumo e produtos", async () => {
    const fetch = simularApi([{ corpo: estoqueApi }]);
    const estoque = await fetchStock("ACABANDO");
    expect(chamada(fetch).url).toBe("/api/estoque/?situacao=ACABANDO");
    expect(estoque.summary).toEqual({ products: 3, units: 45, outOfStock: 1, runningLow: 1, sizesOut: 1 });
    expect(estoque.soldDays).toBe(30);
    expect(estoque.items[1]).toEqual({
      sku: "MEI-002", name: "Meia Esportiva", usesSizes: false, quantity: 3, minimum: 5, status: "ACABANDO", sold: 11, sizes: [],
    });
    expect(estoque.items[2].sizes[1]).toEqual({ size: 40, quantity: 22, status: "OK" });
  });

  it("sem filtro, não manda parâmetro", async () => {
    const fetch = simularApi([{ corpo: estoqueApi }]);
    await fetchStock();
    expect(chamada(fetch).url).toBe("/api/estoque/");
  });

  it("acerta a contagem com quantidade e mínimo", async () => {
    const fetch = simularApi([{ corpo: { ...estoqueApi.produtos[0], estoque: 20, minimo: 4, situacao: "OK" } }]);
    const produto = await updateStock("BOT-003", 20, 4);
    expect(chamada(fetch)).toMatchObject({ url: "/api/estoque/BOT-003/", method: "POST" });
    expect(chamada(fetch).body).toEqual({ quantidade: 20, minimo: 4 });
    expect(produto).toMatchObject({ sku: "BOT-003", quantity: 20, minimum: 4, status: "OK" });
  });

  it("no calçado, a contagem é de uma numeração", async () => {
    const fetch = simularApi([{ corpo: estoqueApi.produtos[2] }]);
    const produto = await updateStock("TEN-001", 20, 2, 39);
    expect(chamada(fetch).body).toEqual({ quantidade: 20, minimo: 2, numeracao: 39 });
    expect(produto.sizes).toHaveLength(2);
  });

  it("mostra o erro do backend", async () => {
    simularApi([{ status: 400, corpo: { erro: "Informe a quantidade em estoque (zero ou mais)." } }]);
    await expect(updateStock("BOT-003", -1, 4)).rejects.toThrow("Informe a quantidade em estoque (zero ou mais).");
  });
});

describe("login da equipe", () => {
  it("devolve quem está logado", async () => {
    const fetch = simularApi([{ corpo: { usuario: "gerente", nome: "Paula Lima" } }]);
    expect(await fetchStaff()).toEqual({ username: "gerente", name: "Paula Lima" });
    expect(chamada(fetch).url).toBe("/api/equipe/");
  });

  it("sem sessão (401), devolve null", async () => {
    simularApi([{ status: 401, corpo: { erro: "Entre com um usuário da equipe da loja." } }]);
    expect(await fetchStaff()).toBeNull();
  });

  it("outros erros continuam sendo erro", async () => {
    simularApi([{ status: 500 }]);
    await expect(fetchStaff()).rejects.toThrow("Erro 500 no servidor.");
  });

  it("entra com usuário e senha e o token CSRF", async () => {
    const fetch = simularApi([{ corpo: { usuario: "gerente", nome: "Paula Lima" } }]);
    expect(await staffSignIn("gerente", "Calcados#2026")).toEqual({ username: "gerente", name: "Paula Lima" });
    expect(chamada(fetch)).toMatchObject({
      url: "/api/equipe/entrar/",
      method: "POST",
      headers: { "X-CSRFToken": "token-de-teste" },
      body: { usuario: "gerente", senha: "Calcados#2026" },
    });
  });

  it("mostra o erro de senha errada", async () => {
    simularApi([{ status: 400, corpo: { erro: "Usuário ou senha incorretos." } }]);
    await expect(staffSignIn("gerente", "errada")).rejects.toThrow("Usuário ou senha incorretos.");
  });

  it("sai", async () => {
    const fetch = simularApi([{ corpo: {} }]);
    await staffSignOut();
    expect(chamada(fetch)).toMatchObject({ url: "/api/equipe/sair/", method: "POST" });
  });
});

describe("exclusão da conta", () => {
  it("manda a senha para confirmar", async () => {
    const fetch = simularApi([{ corpo: {} }]);
    await deleteAccount("sapato-azul-2026");
    expect(chamada(fetch)).toMatchObject({ url: "/api/conta/excluir/", method: "POST", body: { senha: "sapato-azul-2026" } });
  });

  it("senha errada vira erro com a mensagem do backend", async () => {
    simularApi([{ status: 400, corpo: { erro: "A senha não confere." } }]);
    await expect(deleteAccount("errada")).rejects.toThrow("A senha não confere.");
  });
});
