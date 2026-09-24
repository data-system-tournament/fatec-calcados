import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { LEVEL_DISCOUNT, PAYMENT_METHODS, PIX_POINTS_BONUS, REGISTER_NAME } from "../config";
import { currentTime, formatMoney, formatNumber, plural, roundMoney } from "../utils/format";
import Cart from "./pdv/Cart";
import ClientPanel from "./pdv/ClientPanel";
import DiscountModal from "./pdv/DiscountModal";
import ProductSearch from "./pdv/ProductSearch";
import SaleDoneModal from "./pdv/SaleDoneModal";
import SangriaModal from "./pdv/SangriaModal";

// Ordem dos descontos: primeiro o do nível do cliente, depois o do gerente.
function calculateTotals(items, client, managerDiscount) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.product.price * item.quantity;
  }
  subtotal = roundMoney(subtotal);

  const levelPercent = client ? LEVEL_DISCOUNT[client.level] : 0;
  const levelDiscount = roundMoney(subtotal * levelPercent);
  const managerValue = roundMoney((subtotal - levelDiscount) * managerDiscount);
  const total = roundMoney(subtotal - levelDiscount - managerValue);

  return { subtotal, levelPercent, levelDiscount, managerValue, total };
}

function calculatePoints(total, paymentMethod) {
  const bonus = paymentMethod === "Pix" ? PIX_POINTS_BONUS : 0;
  return Math.round(total * (1 + bonus));
}

const CANCELS_BEFORE_ALERT = 3;

function Pdv({ online, onToggleOnline, pending, products, clients, onRegisterClient, onFinishSale, onAlert, notify }) {
  const [openedAt] = useState(currentTime);
  const [cart, setCart] = useState([]); // [{ sku, quantity }]
  const [selectedSku, setSelectedSku] = useState(null);
  const [clientCpf, setClientCpf] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [managerDiscount, setManagerDiscount] = useState(0);
  const [openModal, setOpenModal] = useState(null); // "discount" | "sangria" | "done"
  const [lastSale, setLastSale] = useState(null);
  const [cancelsInARow, setCancelsInARow] = useState(0);
  const searchInputRef = useRef(null);

  const client = clients.find((c) => c.cpf === clientCpf);
  const items = cart.map((item) => ({
    ...item,
    product: products.find((p) => p.sku === item.sku),
  }));
  const totals = calculateTotals(items, client, managerDiscount);
  const points = client ? calculatePoints(totals.total, paymentMethod) : 0;

  function addProduct(product) {
    const alreadyInCart = cart.some((item) => item.sku === product.sku);
    if (alreadyInCart) {
      changeQuantity(product.sku, 1);
    } else {
      setCart([...cart, { sku: product.sku, quantity: 1 }]);
    }
    setSelectedSku(product.sku);
    setCancelsInARow(0);
  }

  function changeQuantity(sku, change) {
    setCart(cart.map((item) => {
      if (item.sku !== sku) return item;
      return { ...item, quantity: Math.max(1, item.quantity + change) };
    }));
  }

  // Cancela o item selecionado, ou o último se nenhum estiver selecionado.
  // Vários cancelamentos seguidos geram alerta no antifraude.
  function cancelItem() {
    if (cart.length === 0) return;

    const selectedInCart = cart.some((item) => item.sku === selectedSku);
    const sku = selectedInCart ? selectedSku : cart[cart.length - 1].sku;
    const product = products.find((p) => p.sku === sku);

    setCart(cart.filter((item) => item.sku !== sku));
    setSelectedSku(null);
    notify(`Item cancelado: ${product.name}`);

    const cancels = cancelsInARow + 1;
    setCancelsInARow(cancels);
    if (cancels === CANCELS_BEFORE_ALERT) {
      onAlert(`${CANCELS_BEFORE_ALERT} cancelamentos seguidos`);
    }
  }

  function finishSale() {
    if (cart.length === 0 || openModal) return;

    let itemCount = 0;
    for (const item of cart) itemCount += item.quantity;

    const sale = {
      id: crypto.randomUUID(),
      total: totals.total,
      subtotal: totals.subtotal,
      payment: paymentMethod,
      clientCpf: client ? client.cpf : null,
      clientName: client ? client.name : null,
      points,
      itemCount,
      time: currentTime(),
      hour: new Date().getHours(),
    };
    onFinishSale(sale);
    setLastSale(sale);
    setOpenModal("done");
  }

  function startNewSale() {
    setCart([]);
    setSelectedSku(null);
    setClientCpf(null);
    setPaymentMethod("Pix");
    setManagerDiscount(0);
    setCancelsInARow(0);
    setOpenModal(null);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function removeManagerDiscount() {
    setManagerDiscount(0);
    setOpenModal(null);
    notify("Desconto removido");
  }

  function registerClient(newClient) {
    onRegisterClient(newClient);
    setClientCpf(newClient.cpf);
  }

  // Atalhos: F2 vai para a busca, F10 finaliza a venda.
  // Sem lista de dependências de propósito: o atalho sempre usa o carrinho atual.
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
          <Icon name={online ? "wifiOff" : "wifi"} size={14} />
          {online ? "Simular queda de internet" : "Reconectar"}
        </button>
      </div>

      {!online && (
        <div className="offline" role="status">
          <Icon name="wifiOff" size={16} />
          Sem internet. Vendas salvas neste caixa ({pending} {plural(pending, "pendente", "pendentes")}).
          Sincroniza sozinho quando a conexão voltar.
        </div>
      )}

      <div className="pdv">
        <section className="pdv-left">
          <ProductSearch products={products} onAdd={addProduct} inputRef={searchInputRef} />
          <Cart items={items} selectedSku={selectedSku} onSelect={setSelectedSku} onChangeQuantity={changeQuantity} />

          <div className="pdv-tools">
            <button className="btn sm" onClick={() => setOpenModal("discount")}>
              {managerDiscount > 0 ? `Desconto ${managerDiscount * 100}% aplicado` : "Desconto (senha gerente)"}
            </button>
            <button className="btn sm" onClick={cancelItem} disabled={cart.length === 0}>Cancelar item</button>
            <button className="btn sm" onClick={() => setOpenModal("sangria")}>Sangria</button>
          </div>

          <Totals totals={totals} client={client} managerDiscount={managerDiscount} />
        </section>

        <aside className="pdv-right">
          <ClientPanel
            client={client}
            clients={clients}
            onSelect={setClientCpf}
            onClear={() => setClientCpf(null)}
            onRegister={registerClient}
          />

          {client && cart.length > 0 && (
            <div className="earn">
              <div><span>Pontos nesta compra</span><b>+{formatNumber(points)}</b></div>
              {paymentMethod === "Pix" && <small>Inclui bônus Pix de {PIX_POINTS_BONUS * 100}%</small>}
              {totals.levelPercent > 0 && (
                <small>Desconto {client.level} de {totals.levelPercent * 100}% aplicado</small>
              )}
            </div>
          )}

          <h2 className="pay-h">Pagamento</h2>
          <div className="pay">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                className={method === paymentMethod ? "pay-btn on" : "pay-btn"}
                aria-pressed={method === paymentMethod}
                onClick={() => setPaymentMethod(method)}
              >
                <span>{method}</span>
                {method === "Pix" && <small>+{PIX_POINTS_BONUS * 100}% em pontos</small>}
              </button>
            ))}
          </div>

          <button className="finish" onClick={finishSale} disabled={cart.length === 0}>
            <span>Finalizar venda</span><kbd>F10</kbd>
          </button>
        </aside>
      </div>

      {openModal === "discount" && (
        <DiscountModal
          currentDiscount={managerDiscount}
          onRemove={removeManagerDiscount}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "sangria" && (
        <SangriaModal onClose={() => setOpenModal(null)} onAlert={onAlert} notify={notify} />
      )}
      {openModal === "done" && (
        <SaleDoneModal sale={lastSale} online={online} onClose={startNewSale} />
      )}
    </div>
  );
}

function Totals({ totals, client, managerDiscount }) {
  const hasDiscount = totals.levelDiscount > 0 || totals.managerValue > 0;

  return (
    <div className="totals">
      {hasDiscount && (
        <div className="sub"><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
      )}
      {totals.levelDiscount > 0 && (
        <div className="sub">
          <span>Desconto {client.level} ({totals.levelPercent * 100}%)</span>
          <span>− {formatMoney(totals.levelDiscount)}</span>
        </div>
      )}
      {totals.managerValue > 0 && (
        <div className="sub">
          <span>Desconto gerente ({managerDiscount * 100}%)</span>
          <span>− {formatMoney(totals.managerValue)}</span>
        </div>
      )}
      <div className="grand"><span>Total</span><strong>{formatMoney(totals.total)}</strong></div>
    </div>
  );
}

export default Pdv;
