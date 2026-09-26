import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button, LinkButton } from "../../components/ui/Button";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { errorClass, fieldLabelClass, inputClass } from "../../components/ui/styles";
import { errorMessage, fetchClient, registerClient } from "../../services/api";
import type { Client } from "../../types";
import { formatCpf, onlyDigits } from "../../utils/cpf";
import Secao from "./Secao";

type Status = "typing" | "searching" | "found" | "notFound";

type ClientPanelProps = {
  client: Client | null;
  onSelect: (client: Client) => void;
  onClear: () => void;
  onRegistered: (client: Client) => void;
};

function ClientPanel({ client, onSelect, onClear, onRegistered }: ClientPanelProps) {
  const [cpf, setCpf] = useState("");
  const [found, setFound] = useState<Client | null>(null);
  const [status, setStatus] = useState<Status>("typing");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  if (client) {
    function changeClient() {
      setCpf("");
      setStatus("typing");
      onClear();
    }

    return (
      <Secao titulo="Cliente" acao={<LinkButton onClick={changeClient}>Trocar</LinkButton>}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-ink text-[13px] font-semibold text-surface">
            {iniciais(client.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-.01em]">
              <span className="truncate">{client.name}</span> <LevelBadge level={client.level} />
            </div>
            <small className="text-xs text-muted tabular-nums">CPF {formatCpf(client.cpf)}</small>
          </div>
        </div>
      </Secao>
    );
  }

  async function handleCpfChange(event: ChangeEvent<HTMLInputElement>) {
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
      setError(errorMessage(e));
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
      setError(errorMessage(e));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && status === "found" && found) onSelect(found);
  }

  return (
    <Secao titulo="Cliente">
      <label className={fieldLabelClass}>
        CPF
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={handleCpfChange}
          onKeyDown={handleKeyDown}
        />
      </label>

      {status === "typing" && !error && (
        <small className="block text-[12.5px] text-muted">Informe o CPF para o cliente ganhar pontos. Sem CPF, a venda sai sem pontos.</small>
      )}
      {status === "searching" && <small className="text-[13px] text-muted" role="status">Procurando cliente...</small>}

      {status === "found" && found && (
        <Button variant="dark" size="sm" className="w-full" onClick={() => onSelect(found)}>
          Usar {found.name} ({found.level})
        </Button>
      )}

      {status === "notFound" && (
        <div className="flex flex-col gap-2">
          <small className="text-xs text-muted" role="status">CPF sem cadastro. Cadastre agora e o cliente já ganha pontos nesta compra.</small>
          <input
            className="rounded-md border border-line-2 bg-surface px-2.5 py-2"
            placeholder="Nome do cliente"
            aria-label="Nome do cliente"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button variant="dark" size="sm" disabled={!newName.trim()} onClick={handleRegister}>Cadastrar</Button>
        </div>
      )}

      {error && <p className={errorClass} role="alert">{error}</p>}
    </Secao>
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default ClientPanel;
