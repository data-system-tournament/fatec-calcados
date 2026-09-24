import { useState } from "react";
import Icon from "../components/Icon";
import { formatNumber } from "../utils/format";
import ActionModal from "./actions/ActionModal";

function Actions({ actions, onActionDone, automations, onToggleAutomation, today, registers }) {
  const [openActionId, setOpenActionId] = useState(null);
  const openAction = actions.find((a) => a.id === openActionId);

  function finishAction(message) {
    onActionDone(openActionId, message);
    setOpenActionId(null);
  }

  return (
    <div className="acts">
      <div className="act-list">
        {actions.length === 0 && (
          <div className="card act"><p>Nenhuma ação pendente.</p></div>
        )}

        {actions.map((action) => (
          <ActionCard key={action.id} action={action} onOpen={() => setOpenActionId(action.id)} />
        ))}

        <Automations automations={automations} onToggle={onToggleAutomation} />
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
        <ActionModal action={openAction} onDone={finishAction} onClose={() => setOpenActionId(null)} />
      )}
    </div>
  );
}

function registerStatus(register) {
  if (register.online) return "online";
  if (register.pending > 0) return `offline · ${register.pending} para sincronizar`;
  return "offline";
}

function ActionCard({ action, onOpen }) {
  let className = "card act";
  if (action.done) className += " done";
  else if (action.warn) className += " warn";

  return (
    <div className={className}>
      <div>
        <h3>{action.title}</h3>
        <p>{action.done ? action.doneText : action.sub}</p>
      </div>

      {action.done ? (
        <span className="check" aria-label="Concluído"><Icon name="check" size={14} /> Feito</span>
      ) : (
        <button className={action.warn ? "btn" : "btn dark"} onClick={onOpen}>{action.cta}</button>
      )}
    </div>
  );
}

// automations: { "Aniversário": true, "Carrinho": false, ... }
function Automations({ automations, onToggle }) {
  const names = Object.keys(automations);

  return (
    <div className="card autos">
      <h2>Automações</h2>
      {names.length === 0 && <p className="hint">Nenhuma automação configurada.</p>}

      {names.map((name) => {
        const active = automations[name];
        return (
          <div key={name} className="auto-row">
            <span>{name}</span>
            <button
              className={active ? "toggle on" : "toggle"}
              role="switch"
              aria-checked={active}
              aria-label={name}
              onClick={() => onToggle(name)}
            >
              <span className="knob" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Actions;
