import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { fieldLabelClass, inputClass } from "../../components/ui/styles";
import { useToast } from "../../contexts/toast";
import type { Action } from "../../types";
import { plural } from "../../utils/format";

type ActionModalProps = {
  action: Action;
  onDone: () => void;
  onClose: () => void;
};

// Lista os clientes da ação e deixa copiar a mensagem sugerida (editável) para enviar pelo canal da loja.
function ActionModal({ action, onDone, onClose }: ActionModalProps) {
  const notify = useToast();
  const [message, setMessage] = useState(action.message);
  const count = action.clients.length;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      notify("Mensagem copiada");
    } catch {
      notify("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  }

  const footer = (
    <>
      <Button onClick={copyMessage}>Copiar mensagem</Button>
      <Button variant="dark" onClick={onDone}>Marcar como feito</Button>
    </>
  );

  return (
    <Modal title={`${action.title} · ${count} ${plural(count, "cliente", "clientes")}`} onClose={onClose} footer={footer}>
      <ul className="mb-3.5 max-h-60 overflow-auto pr-3">
        {action.clients.map((client) => (
          <li
            key={`${client.name}-${client.cpf}`}
            className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[13px] last:border-0"
          >
            <span>{client.name}<small className="block text-[11.5px] text-muted">{client.cpf}</small></span>
            <span className="text-muted">{client.detail}</span>
          </li>
        ))}
      </ul>

      <label className={fieldLabelClass}>
        Mensagem sugerida
        <textarea rows={4} className={`${inputClass} resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <p className="mt-2 text-[13px] text-muted">O cadastro ainda não tem telefone: copie a mensagem e envie pelo canal da loja.</p>
    </Modal>
  );
}

export default ActionModal;
