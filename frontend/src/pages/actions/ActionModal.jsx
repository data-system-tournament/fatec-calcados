import { useState } from "react";
import Modal from "../../components/Modal";
import { formatMoney, formatNameList, formatNumber, plural } from "../../utils/format";

// Cada ação vem do backend com um `type` e os dados que o modal precisa:
//   sumindo:  { clients: ["Nome", ...] }
//   carrinho: { count, value }
//   estoque:  { product: { name, price, stock } }
//   cupons:   { coupons: [{ id, client, value, time }] }
function ActionModal({ action, onDone, onClose }) {
  switch (action.type) {
    case "sumindo":
      return <WhatsAppModal clients={action.clients} onDone={onDone} onClose={onClose} />;
    case "carrinho":
      return <AbandonedCartModal count={action.count} value={action.value} onDone={onDone} onClose={onClose} />;
    case "estoque":
      return <RewardModal product={action.product} onDone={onDone} onClose={onClose} />;
    case "cupons":
      return <CouponsModal coupons={action.coupons} onDone={onDone} onClose={onClose} />;
    default:
      return null;
  }
}

function WhatsAppModal({ clients, onDone, onClose }) {
  const [message, setMessage] = useState(
    "Olá! Sentimos sua falta. Você ganhou 150 pontos + frete grátis na próxima compra. Válido por 7 dias."
  );
  const names = formatNameList(clients);

  const footer = (
    <>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn dark" onClick={() => onDone(`Mensagem enviada para ${names}`)}>Enviar mensagem</button>
    </>
  );

  return (
    <Modal
      title={`Enviar WhatsApp para ${clients.length} ${plural(clients.length, "cliente", "clientes")}`}
      onClose={onClose}
      footer={footer}
    >
      <p className="muted">{names}</p>
      <label className="field">
        Mensagem
        <textarea rows="4" value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <p className="muted">{message.length} caracteres</p>
    </Modal>
  );
}

function AbandonedCartModal({ count, value, onDone, onClose }) {
  const footer = (
    <>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn dark" onClick={() => onDone(`Notificação push enviada para ${count} clientes`)}>Enviar notificação</button>
    </>
  );

  return (
    <Modal title={`Notificar ${count} carrinhos abandonados`} onClose={onClose} footer={footer}>
      <div className="push-preview">
        <b>Seu carrinho está te esperando</b>
        <span>Finalize hoje e ganhe pontos em dobro.</span>
      </div>
      <p className="muted">{formatMoney(value)} em produtos. A notificação chega pelo app.</p>
    </Modal>
  );
}

function RewardModal({ product, onDone, onClose }) {
  const [points, setPoints] = useState(2500);

  function createReward() {
    onDone(`${product.name} disponível para resgate por ${formatNumber(points)} pts (nível Ouro)`);
  }

  const footer = (
    <>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn dark" onClick={createReward}>Criar recompensa</button>
    </>
  );

  return (
    <Modal title={`Criar recompensa: ${product.name}`} onClose={onClose} footer={footer}>
      <label className="field">
        Custo em pontos
        <input type="number" min="100" step="100" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
      </label>
      <p className="muted">
        Disponível só para clientes Ouro. Preço de venda: {formatMoney(product.price)} · {product.stock} unidades em estoque.
      </p>
    </Modal>
  );
}

// Vendas feitas sem internet: o gerente decide se credita ou recusa os pontos de cada cupom.
function CouponsModal({ coupons, onDone, onClose }) {
  const [decisions, setDecisions] = useState({}); // { idDoCupom: "credit" | "refuse" }

  const allDecided = coupons.every((coupon) => decisions[coupon.id]);

  function decide(couponId, decision) {
    setDecisions({ ...decisions, [couponId]: decision });
  }

  function finishReview() {
    const credited = coupons.filter((c) => decisions[c.id] === "credit").length;
    const refused = coupons.length - credited;
    onDone(`${credited} crédito(s) liberado(s), ${refused} recusado(s)`);
  }

  const footer = (
    <button className="btn dark" disabled={!allDecided} onClick={finishReview}>Concluir revisão</button>
  );

  return (
    <Modal title="Cupons do modo contingência" onClose={onClose} footer={footer}>
      <p className="muted">Vendas feitas sem internet. Confirme para creditar os pontos.</p>
      <ul className="coupons">
        {coupons.map((coupon) => (
          <li key={coupon.id}>
            <div>
              <b>{coupon.client}</b>
              <small>{coupon.id} · {coupon.time} · {formatMoney(coupon.value)}</small>
            </div>
            <div className="seg-btns">
              <button
                className={decisions[coupon.id] === "credit" ? "btn sm dark" : "btn sm"}
                onClick={() => decide(coupon.id, "credit")}
              >
                Creditar
              </button>
              <button
                className={decisions[coupon.id] === "refuse" ? "btn sm danger" : "btn sm"}
                onClick={() => decide(coupon.id, "refuse")}
              >
                Recusar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default ActionModal;
