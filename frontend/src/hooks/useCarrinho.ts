import { useState } from "react";
import { useCaixa } from "../contexts/caixa";
import { useToast } from "../contexts/toast";
import { estimatePoints, maxRedeemPoints, pointsToMoney } from "../regras";
import type { Product, Sale } from "../types";
import { chaveDoItem, mudarQuantidade, somarAoCarrinho, tirarDoCarrinho } from "../utils/carrinho";
import { currentTime, roundMoney } from "../utils/format";

// Carrinho da venda em andamento: itens, resgate de pontos e totais. O estado em si vive no
// CaixaProvider (para sobreviver à troca de aba); aqui ficam as contas e as ações sobre ele.
export function useCarrinho() {
  const { products, currentSale, updateSale } = useCaixa();
  const notify = useToast();
  const { cart, client, paymentMethod, pointsToRedeem } = currentSale;
  // Item selecionado no carrinho, pela chave (sku + numeração: o mesmo tênis em dois números são dois itens).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

  // `size`: a numeração do calçado (escolhida no SeletorNumeracao); null no acessório.
  function addProduct(product: Product, size: number | null) {
    updateSale({ cart: somarAoCarrinho(cart, product.sku, size) });
    setSelectedKey(chaveDoItem({ sku: product.sku, size }));
  }

  function changeQuantity(key: string, change: number) {
    updateSale({ cart: mudarQuantidade(cart, key, change) });
  }

  function removeItem(key: string) {
    const item = items.find((i) => chaveDoItem(i) === key);
    updateSale({ cart: tirarDoCarrinho(cart, key) });
    if (item) notify(`Item removido: ${item.product.name}${item.size !== null ? ` nº ${item.size}` : ""}`);
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
    selectedKey,
    setSelectedKey,
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
