import type { CartItem } from "../types";

// Feito com IA: operações do carrinho usadas pelo PDV e pela loja online. Com o estoque por numeração, o
// mesmo produto em dois números são dois itens: a chave de um item é o sku mais a numeração.

export function chaveDoItem(item: { sku: string; size: number | null }) {
  return item.size === null ? item.sku : `${item.sku}#${item.size}`;
}

// Soma ao item que já existe (mesmo sku e numeração) ou cria um novo no fim.
export function somarAoCarrinho(cart: CartItem[], sku: string, size: number | null, quantity = 1): CartItem[] {
  const chave = chaveDoItem({ sku, size });
  return cart.some((item) => chaveDoItem(item) === chave)
    ? cart.map((item) => (chaveDoItem(item) === chave ? { ...item, quantity: item.quantity + quantity } : item))
    : [...cart, { sku, size, quantity }];
}

// Muda a quantidade de um item, sem deixar cair abaixo de 1 (para tirar existe o remover).
export function mudarQuantidade(cart: CartItem[], chave: string, change: number): CartItem[] {
  return cart.map((item) => (chaveDoItem(item) === chave ? { ...item, quantity: Math.max(1, item.quantity + change) } : item));
}

export function tirarDoCarrinho(cart: CartItem[], chave: string): CartItem[] {
  return cart.filter((item) => chaveDoItem(item) !== chave);
}

// Quantas unidades de cada produto há no carrinho, somando as numerações (para marcar o card do catálogo).
export function unidadesPorProduto(cart: CartItem[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const item of cart) total[item.sku] = (total[item.sku] ?? 0) + item.quantity;
  return total;
}
