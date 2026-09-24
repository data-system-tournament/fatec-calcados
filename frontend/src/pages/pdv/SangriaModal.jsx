import { useState } from "react";
import Modal from "../../components/Modal";
import { CLOSING_HOUR, OPENING_HOUR, REGISTER_NAME } from "../../config";
import { formatMoney } from "../../utils/format";

// Sangria = retirada de dinheiro do caixa.
function SangriaModal({ onClose, onAlert, notify }) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("Excesso de dinheiro no caixa");

  const amount = Number(value);

  function registerSangria() {
    const hour = new Date().getHours();
    if (hour < OPENING_HOUR || hour >= CLOSING_HOUR) {
      onAlert("Sangria fora do horário");
    }
    notify(`Sangria de ${formatMoney(amount)} registrada`);
    onClose();
  }

  const footer = (
    <button className="btn dark" disabled={amount <= 0} onClick={registerSangria}>Registrar sangria</button>
  );

  return (
    <Modal title={`Sangria do ${REGISTER_NAME}`} onClose={onClose} footer={footer}>
      <label className="field">
        Valor retirado (R$)
        <input type="number" min="0" step="10" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <label className="field">
        Motivo
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <p className="muted">
        Sangrias fora do horário comercial ({OPENING_HOUR}h às {CLOSING_HOUR}h) geram alerta no antifraude.
      </p>
    </Modal>
  );
}

export default SangriaModal;
