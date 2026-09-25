import { useState } from "react";
import { useCaixa } from "../contexts/caixa";
import { useToast } from "../contexts/toast";
import { estimatePoints, maxRedeemPoints, pointsToMoney } from "../regras";
import type { Product, Sale } from "../types";
import { currentTime, roundMoney } from "../utils/format";

// Carrinho da venda em andamento: itens, resgate de pontos e totais. O estado em si vive no
// CaixaProvider (para sobreviver à troca de aba); aqui ficam as contas e as ações sobre ele.
export function useCarrinho() {
  const { products, currentSale, updateSale } = useCaixa();
  const notify = useToast();
  const { cart, client, paymentMethod, pointsToRedeem } = currentSale;
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const items = cart.flatMap((item) => {
    const product = products.find((p) => p.sku === item.sku);
    return product ? [{ ...item, product }] : [];
  });

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.product.price * item.quantity;
  }
  subtotal = roundMoney(subtotal);

  const maxRedeem = client ? maxRedeemPoints(client.redeemablePoints, subtotal) : 0;
  const pointsUsed = Math.min(pointsToRedeem, maxRedeem);
  const pointsDiscount = pointsToMoney(pointsUsed);
  const total = roundMoney(subtotal - pointsDiscount);
  const points = client ? estimatePoints(total, client.bonusPercent) : 0;

  function addProduct(product: Product) {
    const alreadyInCart = cart.some((item) => item.sku === product.sku);
    if (alreadyInCart) {
      changeQuantity(product.sku, 1);
    } else {
      updateSale({ cart: [...cart, { sku: product.sku, quantity: 1 }] });
    }
    setSelectedSku(product.sku);
  }

  function changeQuantity(sku: string, change: number) {
    updateSale({
      cart: cart.map((item) => {
        if (item.sku !== sku) return item;
        return { ...item, quantity: Math.max(1, item.quantity + change) };
      }),
    });
  }

  function removeItem(sku: string) {
    const product = products.find((p) => p.sku === sku);
    updateSale({ cart: cart.filter((item) => item.sku !== sku) });
    if (product) notify(`Item removido: ${product.name}`);
  }

  // Monta a venda para enviar. `total` e `points` são prévias: o backend devolve os valores oficiais.
  function buildSale(): Sale {
    let itemCount = 0;
    for (const item of cart) itemCount += item.quantity;

    return {
      id: crypto.randomUUID(),
      cpf: client ? client.cpf : null,
      clientName: client ? client.name : null,
      items: cart,
      payment: paymentMethod,
      pointsToRedeem: pointsUsed,
      date: new Date().toISOString(),
      total,
      points,
      itemCount,
      time: currentTime(),
    };
  }

  return {
    hasItems: cart.length > 0,
    client,
    paymentMethod,
    items,
    selectedSku,
    setSelectedSku,
    subtotal,
    maxRedeem,
    pointsUsed,
    pointsDiscount,
    total,
    points,
    addProduct,
    changeQuantity,
    removeItem,
    buildSale,
  };
}
