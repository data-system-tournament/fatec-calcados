import { useState } from "react";
import { SIGNUP_BONUS_POINTS } from "../../config";
import { formatCpf, formatNumber, onlyDigits } from "../../utils/format";

// Mostra o cliente da venda, ou o campo de CPF para identificar/cadastrar um.
function ClientPanel({ client, clients, onSelect, onClear, onRegister }) {
  const [cpf, setCpf] = useState("");
  const [newName, setNewName] = useState("");

  if (client) {
    function changeClient() {
      setCpf("");
      onClear();
    }

    return (
      <div className="client card">
        <div className="client-top">
          <small>Cliente · {client.cpf}</small>
          <button className="link" onClick={changeClient}>Trocar</button>
        </div>
        <div className="client-name">
          {client.name} <span className={`badge ${client.level.toLowerCase()}`}>{client.level}</span>
        </div>
        <small>Saldo {formatNumber(client.points)} pts</small>
      </div>
    );
  }

  const cpfComplete = onlyDigits(cpf).length === 11;
  const found = clients.find((c) => onlyDigits(c.cpf) === onlyDigits(cpf));

  function handleKeyDown(event) {
    if (event.key === "Enter" && found) onSelect(found.cpf);
  }

  function registerClient() {
    onRegister({ cpf, name: newName.trim(), level: "Bronze", points: SIGNUP_BONUS_POINTS });
    setNewName("");
  }

  return (
    <div className="client card">
      <label className="field">
        CPF do cliente
        <input
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          onKeyDown={handleKeyDown}
        />
      </label>

      {!cpfComplete && <small className="muted">Digite o CPF para identificar o cliente.</small>}

      {cpfComplete && found && (
        <button className="btn dark sm" onClick={() => onSelect(found.cpf)}>
          Usar {found.name} ({found.level})
        </button>
      )}

      {cpfComplete && !found && (
        <div className="quick-reg">
          <small>CPF sem cadastro. Cadastre agora e o cliente já ganha pontos.</small>
          <input placeholder="Nome do cliente" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn dark sm" disabled={!newName.trim()} onClick={registerClient}>
            Cadastrar (+{SIGNUP_BONUS_POINTS} pts)
          </button>
        </div>
      )}
    </div>
  );
}

export default ClientPanel;
