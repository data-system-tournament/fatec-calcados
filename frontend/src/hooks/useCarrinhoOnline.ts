import { useConta } from "../contexts/conta";
import { estimatePoints, maxRedeemPoints, pointsToMoney } from "../regras";
import type { CartLine, Product } from "../types";
import { chaveDoItem } from "../utils/carrinho";
import { roundMoney } from "../utils/format";

// Item do carrinho online pronto para a tela: a chave (sku + numeração) e quanto há em estoque daquele número.
export type LinhaOnline = CartLine & { key: string; available: number };

// Quanto há do produto naquela numeração (no acessório, o estoque do produto).
export function disponivel(product: Product, size: number | null) {
  if (size === null) return product.stock;
  return product.sizes.find((s) => s.size === size)?.quantity ?? 0;
}

// Contas do carrinho da loja online (mesmas prévias do PDV, com regras.ts). O backend devolve os valores oficiais.
export function useCarrinhoOnline(pointsToRedeem: number) {
  const { account, products, cart } = useConta();

  const lines: LinhaOnline[] = cart.flatMap((item) => {
    const product = products.find((p) => p.sku === item.sku);
    return product ? [{ ...item, product, key: chaveDoItem(item), available: disponivel(product, item.size) }] : [];
  });

  let subtotal = 0;
  let itemCount = 0;
  for (const line of lines) {
    subtotal += line.product.price * line.quantity;
    itemCount += line.quantity;
  }
  subtotal = roundMoney(subtotal);

  const maxRedeem = account ? maxRedeemPoints(account.redeemablePoints, subtotal) : 0;
  const pointsUsed = Math.min(pointsToRedeem, maxRedeem);
  const discount = pointsToMoney(pointsUsed);
  const total = roundMoney(subtotal - discount);
  const points = account ? estimatePoints(total, account.bonusPercent) : 0;

  return { lines, itemCount, subtotal, maxRedeem, pointsUsed, discount, total, points };
}
