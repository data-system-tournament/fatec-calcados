import { useState } from "react";
import Modal from "../../components/Modal";
import { MANAGER_DISCOUNTS } from "../../config";

function DiscountModal({ currentDiscount, onRemove, onClose }) {
  const [percent, setPercent] = useState(MANAGER_DISCOUNTS[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function applyDiscount() {
    // A senha será validada pelo backend; até lá, nenhum desconto é liberado.
    setError("Validação da senha ainda não disponível. Depende do backend.");
  }

  const footer = (
    <>
      {currentDiscount > 0 && <button className="btn" onClick={onRemove}>Remover desconto</button>}
      <button className="btn dark" onClick={applyDiscount}>Aplicar desconto</button>
    </>
  );

  return (
    <Modal title="Desconto com senha do gerente" onClose={onClose} footer={footer}>
      <div className="seg-btns">
        {MANAGER_DISCOUNTS.map((option) => (
          <button key={option} className={option === percent ? "btn dark" : "btn"} onClick={() => setPercent(option)}>
            {option * 100}%
          </button>
        ))}
      </div>

      <label className="field">
        Senha do gerente
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />
      </label>

      {error
        ? <p className="err">{error}</p>
        : <p className="muted">O gerente digita a senha para liberar o desconto.</p>}
    </Modal>
  );
}

export default DiscountModal;
