import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { BLOCK_VALUE, PAYMENT_METHODS, POINTS_PER_BLOCK, REGISTER_NAME } from "../config";
import { currentTime, formatMoney, formatNumber, plural, roundMoney } from "../utils/format";
import Cart from "./pdv/Cart";
import ClientPanel from "./pdv/ClientPanel";
import PointsPanel from "./pdv/PointsPanel";
import ProductSearch from "./pdv/ProductSearch";
import SaleDoneModal from "./pdv/SaleDoneModal";

function maxRedeemPoints(client, subtotal) {
  if (!client) return 0;

  const blocksAllowedByValue = Math.floor(subtotal / BLOCK_VALUE);
  const blocksInBalance = client.redeemablePoints / POINTS_PER_BLOCK;
  return Math.min(blocksAllowedByValue, blocksInBalance) * POINTS_PER_BLOCK;
}

// Feito com IA: mesma conta de regras.calcular_pontos no backend (sem centavos + bônus do nível).
// É só uma prévia; o valor oficial vem na resposta da venda.
function estimatePoints(total, bonusPercent) {
  return Math.floor((Math.floor(total) * (100 + bonusPercent)) / 100);
}

function Pdv({ online, onToggleOnline, pending, products, onClientRegistered, onFinishSale, notify }) {
  const [openedAt] = useState(currentTime);
  const [cart, setCart] = useState([]);
  const [selectedSku, setSelectedSku] = useState(null);
  const [client, setClient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [lastSale, setLastSale] = useState(null);
  const [sending, setSending] = useState(false);
  const searchInputRef = useRef(null);

  const items = cart.map((item) => ({
    ...item,
    product: products.find((p) => p.sku === item.sku),
  }));

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.product.price * item.quantity;
  }
  subtotal = roundMoney(subtotal);

  const maxRedeem = maxRedeemPoints(client, subtotal);
  const pointsUsed = Math.min(pointsToRedeem, maxRedeem);
  const pointsDiscount = (pointsUsed / POINTS_PER_BLOCK) * BLOCK_VALUE;
  const total = roundMoney(subtotal - pointsDiscount);
  const points = client ? estimatePoints(total, client.bonusPercent) : 0;

  function addProduct(product) {
    const alreadyInCart = cart.some((item) => item.sku === product.sku);
    if (alreadyInCart) {
      changeQuantity(product.sku, 1);
    } else {
      setCart([...cart, { sku: product.sku, quantity: 1 }]);
    }
    setSelectedSku(product.sku);
  }

  function changeQuantity(sku, change) {
    setCart(cart.map((item) => {
      if (item.sku !== sku) return item;
      return { ...item, quantity: Math.max(1, item.quantity + change) };
    }));
  }

  function removeItem(sku) {
    const product = products.find((p) => p.sku === sku);
    setCart(cart.filter((item) => item.sku !== sku));
    notify(`Item removido: ${product.name}`);
  }

  async function finishSale() {
    if (cart.length === 0 || lastSale || sending) return;

    let itemCount = 0;
    for (const item of cart) itemCount += item.quantity;

    const sale = {
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

    setSending(true);
    try {
      const recorded = await onFinishSale(sale);
      setLastSale(recorded);
    } catch (error) {
      notify(error.message);
    }
    setSending(false);
  }

  function startNewSale() {
    setCart([]);
    setSelectedSku(null);
    setClient(null);
    setPaymentMethod("PIX");
    setPointsToRedeem(0);
    setLastSale(null);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleClientRegistered(newClient) {
    setClient(newClient);
    onClientRegistered(newClient);
  }

  // Feito com IA: atalhos F2 (busca) e F10 (finalizar). Sem lista de dependências de propósito,
  // para o atalho sempre usar o carrinho atual.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "F2") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "F10") {
        event.preventDefault();
        finishSale();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="pdv-wrap">
      <div className="pdv-top">
        <span className="pdv-id"><b>{REGISTER_NAME}</b><span>Aberto às {openedAt}</span></span>
        <button className="btn sm" onClick={onToggleOnline}>
          {online ? <WifiOff size={14} className="ic" /> : <Wifi size={14} className="ic" />}
          {online ? "Simular queda de internet" : "Reconectar"}
        </button>
      </div>

      {!online && (
        <div className="offline" role="status">
          <WifiOff size={16} className="ic" />
          Sem internet. Vendas salvas neste caixa ({pending} {plural(pending, "pendente", "pendentes")}).
          Sincroniza sozinho quando a conexão voltar.
        </div>
      )}

      <div className="pdv">
        <section className="pdv-left">
          <ProductSearch products={products} onAdd={addProduct} inputRef={searchInputRef} />
          <Cart
            items={items}
            selectedSku={selectedSku}
            onSelect={setSelectedSku}
            onChangeQuantity={changeQuantity}
            onRemove={removeItem}
          />

          <div className="totals">
            {pointsUsed > 0 && (
              <>
                <div className="sub"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                <div className="sub">
                  <span>Pontos usados ({formatNumber(pointsUsed)} pts)</span>
                  <span>− {formatMoney(pointsDiscount)}</span>
                </div>
              </>
            )}
            <div className="grand"><span>Total</span><strong>{formatMoney(total)}</strong></div>
          </div>
        </section>

        <aside className="pdv-right">
          <ClientPanel
            client={client}
            onSelect={setClient}
            onClear={() => setClient(null)}
            onRegistered={handleClientRegistered}
          />

          {client && (
            <PointsPanel
              client={client}
              hasItems={cart.length > 0}
              pointsUsed={pointsUsed}
              maxRedeem={maxRedeem}
              pointsEarned={points}
              onChangeRedeem={setPointsToRedeem}
            />
          )}

          <h2 className="pay-h">Pagamento</h2>
          <div className="pay">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.code}
                className={method.code === paymentMethod ? "pay-btn on" : "pay-btn"}
                aria-pressed={method.code === paymentMethod}
                onClick={() => setPaymentMethod(method.code)}
              >
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          <button className="finish" onClick={finishSale} disabled={cart.length === 0 || sending}>
            <span>{sending ? "Enviando..." : "Finalizar venda"}</span><kbd>F10</kbd>
          </button>
        </aside>
      </div>

      {lastSale && <SaleDoneModal sale={lastSale} onClose={startNewSale} />}
    </div>
  );
}

export default Pdv;
