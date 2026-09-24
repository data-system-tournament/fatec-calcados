import { Check, Hourglass, TrendingUp, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import Modal from "../components/Modal";
import { formatNumber, plural } from "../utils/format";

function Actions({ actions, doneTypes, onDone, today, registers, notify }) {
  const [openType, setOpenType] = useState(null);
  const openAction = actions.find((a) => a.type === openType);

  function markDone(action) {
    onDone(action.type);
    setOpenType(null);
    notify(`“${action.title}” marcada como feita`);
  }

  return (
    <div className="acts">
      <div className="act-list">
        {actions.length === 0 && <div className="card act"><p>Carregando ações...</p></div>}

        {actions.map((action) => (
          <ActionCard
            key={action.type}
            action={action}
            done={doneTypes.includes(action.type)}
            onOpen={() => setOpenType(action.type)}
          />
        ))}
      </div>

      <aside className="pulse">
        <h2>Pulso de hoje</h2>
        <dl>
          <div><dt>Novos cadastros</dt><dd>{today.newClients}</dd></div>
          <div><dt>Pontos resgatados</dt><dd>{formatNumber(today.pointsRedeemed)}</dd></div>
        </dl>

        <h2>Caixas</h2>
        <ul className="caixas">
          {registers.map((register) => (
            <li key={register.name}>
              <i className={register.online ? "led on" : "led off"} />
              <span>{register.name}</span>
              <small>{registerStatus(register)}</small>
            </li>
          ))}
        </ul>
      </aside>

      {openAction && (
        <ActionModal action={openAction} onDone={() => markDone(openAction)} onClose={() => setOpenType(null)} notify={notify} />
      )}
    </div>
  );
}

const ACTION_ICONS = {
  sumindo: UserX,
  vencendo: Hourglass,
  subir: TrendingUp,
  segunda_compra: UserPlus,
};

function registerStatus(register) {
  if (register.online) return "online";
  if (register.pending > 0) return `offline · ${register.pending} para sincronizar`;
  return "offline";
}

function ActionCard({ action, done, onOpen }) {
  const count = action.clients.length;
  const preview = action.clients.slice(0, 3).map((c) => c.name).join(", ");
  const ActionIcon = ACTION_ICONS[action.type];

  let className = "card act";
  if (done) className += " done";
  else if (count > 0) className += " warn";

  return (
    <div className={className}>
      <div className="act-main">
        <span className={`act-icon ${action.type}`}><ActionIcon size={28} /></span>
        <div>
          <h3>{action.title} <span className="count">{count}</span></h3>
          <p>{action.description}</p>
          {count > 0 && !done && (
            <p>{preview}{count > 3 && ` e mais ${count - 3}`}</p>
          )}
        </div>
      </div>

      {done && <span className="check" aria-label="Concluído"><Check size={14} /> Feito</span>}
      {!done && count > 0 && <button className="btn dark" onClick={onOpen}>Ver clientes</button>}
      {!done && count === 0 && <span className="muted">Ninguém nesta lista hoje</span>}
    </div>
  );
}

function ActionModal({ action, onDone, onClose, notify }) {
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
      <button className="btn" onClick={copyMessage}>Copiar mensagem</button>
      <button className="btn dark" onClick={onDone}>Marcar como feito</button>
    </>
  );

  return (
    <Modal title={`${action.title} · ${count} ${plural(count, "cliente", "clientes")}`} onClose={onClose} footer={footer}>
      <ul className="client-list">
        {action.clients.map((client) => (
          <li key={`${client.name}-${client.cpf}`}>
            <span>{client.name}<small>{client.cpf}</small></span>
            <span className="muted">{client.detail}</span>
          </li>
        ))}
      </ul>

      <label className="field">
        Mensagem sugerida
        <textarea rows="4" value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <p className="muted">O cadastro ainda não tem telefone: copie a mensagem e envie pelo canal da loja.</p>
    </Modal>
  );
}

export default Actions;
