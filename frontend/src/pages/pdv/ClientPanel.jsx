import { useState } from "react";
import { fetchClient, registerClient } from "../../services/api";
import { formatCpf, onlyDigits } from "../../utils/format";

function ClientPanel({ client, onSelect, onClear, onRegistered }) {
  const [cpf, setCpf] = useState("");
  const [found, setFound] = useState(null);
  const [status, setStatus] = useState("typing");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  if (client) {
    function changeClient() {
      setCpf("");
      setStatus("typing");
      onClear();
    }

    return (
      <div className="client card">
        <div className="client-top">
          <small>Cliente · {formatCpf(client.cpf)}</small>
          <button className="link" onClick={changeClient}>Trocar</button>
        </div>
        <div className="client-name">
          {client.name} <span className={`badge ${client.level.toLowerCase()}`}>{client.level}</span>
        </div>
      </div>
    );
  }

  async function handleCpfChange(event) {
    const value = formatCpf(event.target.value);
    setCpf(value);
    setError("");

    if (onlyDigits(value).length < 11) {
      setStatus("typing");
      return;
    }

    setStatus("searching");
    try {
      const result = await fetchClient(onlyDigits(value));
      setFound(result);
      setStatus(result ? "found" : "notFound");
    } catch (e) {
      setError(e.message);
      setStatus("typing");
    }
  }

  async function handleRegister() {
    setError("");
    try {
      const newClient = await registerClient(onlyDigits(cpf), newName.trim());
      setNewName("");
      onRegistered(newClient);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && status === "found") onSelect(found);
  }

  return (
    <div className="client card">
      <label className="field">
        CPF do cliente
        <input
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={handleCpfChange}
          onKeyDown={handleKeyDown}
        />
      </label>

      {status === "typing" && !error && <small className="muted">Digite o CPF para identificar o cliente.</small>}
      {status === "searching" && <small className="muted">Procurando cliente...</small>}

      {status === "found" && (
        <button className="btn dark sm" onClick={() => onSelect(found)}>
          Usar {found.name} ({found.level})
        </button>
      )}

      {status === "notFound" && (
        <div className="quick-reg">
          <small>CPF sem cadastro. Cadastre agora e o cliente já ganha pontos nesta compra.</small>
          <input placeholder="Nome do cliente" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn dark sm" disabled={!newName.trim()} onClick={handleRegister}>Cadastrar</button>
        </div>
      )}

      {error && <p className="err">{error}</p>}
    </div>
  );
}

export default ClientPanel;
