import { useConta } from "../contexts/conta";
import { estimatePoints, maxRedeemPoints, pointsToMoney } from "../regras";
import type { CartLine } from "../types";
import { roundMoney } from "../utils/format";

// Contas do carrinho da loja online (mesmas prévias do PDV, com regras.ts). O backend devolve os valores oficiais.
export function useCarrinhoOnline(pointsToRedeem: number) {
  const { account, products, cart } = useConta();

  const lines: CartLine[] = cart.flatMap((item) => {
    const product = products.find((p) => p.sku === item.sku);
    return product ? [{ ...item, product }] : [];
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
