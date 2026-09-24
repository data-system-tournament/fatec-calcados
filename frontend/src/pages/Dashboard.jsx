import { useState } from "react";
import Icon from "../components/Icon";
import SalesChart from "../components/SalesChart";
import { CHART_HOURS, LEVEL_DISCOUNT, LEVELS, PAYMENT_METHODS, RFM_GROUPS } from "../config";
import { formatMoneyShort, formatNumber, plural } from "../utils/format";

// Junta as vendas do dia nos números que o dashboard mostra.
// Vendas feitas offline só entram depois de sincronizar.
function summarizeSales(sales) {
  const summary = {
    revenue: 0,
    count: 0,
    points: 0,
    withCpf: 0,
    byPayment: {},
    byHour: CHART_HOURS.map((hour) => ({ hour, store: 0, app: 0 })),
  };
  for (const method of PAYMENT_METHODS) {
    summary.byPayment[method] = 0;
  }

  for (const sale of sales) {
    if (!sale.synced) continue;

    summary.revenue += sale.total;
    summary.count += 1;
    summary.points += sale.points;
    if (sale.clientCpf) summary.withCpf += 1;
    summary.byPayment[sale.payment] += sale.total;

    const hourIndex = Math.min(Math.max(sale.hour - 8, 0), CHART_HOURS.length - 1);
    summary.byHour[hourIndex].store += sale.total;
  }

  return summary;
}

function Dashboard({ sales, alerts, onCheckAlert, clientsPerLevel, rfm, notify }) {
  const summary = summarizeSales(sales);

  return (
    <div className="dash">
      <KpiCards summary={summary} />

      <section className="row2">
        <div className="card">
          <h2>Vendas ao longo do dia</h2>
          <SalesChart data={summary.byHour} />
        </div>
        <PaymentMethods byPayment={summary.byPayment} revenue={summary.revenue} />
      </section>

      <section className="row3">
        <RfmMatrix rfm={rfm} notify={notify} />
        <LevelsCard clientsPerLevel={clientsPerLevel} />
        <FraudAlerts alerts={alerts} onCheckAlert={onCheckAlert} />
      </section>
    </div>
  );
}

function KpiCards({ summary }) {
  const { revenue, count, points, withCpf } = summary;
  const hasSales = count > 0;

  return (
    <section className="kpis">
      <div className="card kpi">
        <span className="lbl">Vendas hoje</span>
        <strong>{formatMoneyShort(revenue)}</strong>
        <small>{count} {plural(count, "venda", "vendas")}</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Ticket médio</span>
        <strong>{hasSales ? formatMoneyShort(revenue / count) : "—"}</strong>
        <small>por venda</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Pontos emitidos</span>
        <strong>{formatNumber(points)}</strong>
        <small>em vendas com CPF</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Vendas identificadas</span>
        <strong>{hasSales ? `${Math.round((withCpf / count) * 100)}%` : "—"}</strong>
        <small>{withCpf} de {count}</small>
      </div>
    </section>
  );
}

function PaymentMethods({ byPayment, revenue }) {
  return (
    <div className="card">
      <h2>Formas de pagamento</h2>
      <ul className="bars">
        {PAYMENT_METHODS.map((method) => {
          const percent = revenue > 0 ? Math.round((byPayment[method] / revenue) * 100) : 0;
          return (
            <li key={method}>
              <span>{method}</span>
              <div className="bar"><div style={{ width: `${percent}%` }} /></div>
              <b>{percent}%</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// rfm: { "Campeões": ["Nome", ...], "Leais": [...], ... }
function RfmMatrix({ rfm, notify }) {
  const [selected, setSelected] = useState(null);

  const group = RFM_GROUPS.find((g) => g.name === selected);
  const names = group ? rfm[group.name] || [] : [];

  function toggleGroup(name) {
    setSelected(selected === name ? null : name);
  }

  function runGroupAction() {
    notify(`${group.action}: ${names.length} clientes`);
    setSelected(null);
  }

  return (
    <div className="card">
      <h2>Matriz RFM</h2>
      <div className="rfm">
        {RFM_GROUPS.map((g) => {
          let className = "seg";
          if (g.name === "Campeões") className += " top";
          if (g.name === selected) className += " on";

          return (
            <button key={g.name} className={className} onClick={() => toggleGroup(g.name)} aria-pressed={g.name === selected}>
              {g.name} <b>{(rfm[g.name] || []).length}</b>
            </button>
          );
        })}
      </div>

      {!group && <p className="hint">Toque em um grupo para ver os clientes.</p>}

      {group && (
        <div className="seg-detail">
          <p>{group.tip}</p>
          {names.length === 0 ? (
            <p className="names">Nenhum cliente neste grupo.</p>
          ) : (
            <>
              <p className="names">{names.join(", ")}</p>
              <button className="btn dark sm" onClick={runGroupAction}>{group.action}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LevelsCard({ clientsPerLevel }) {
  return (
    <div className="card">
      <h2>Níveis</h2>
      <ul className="levels">
        {LEVELS.map((level) => {
          const discount = LEVEL_DISCOUNT[level];
          return (
            <li key={level}>
              <span className={`badge ${level.toLowerCase()}`}>{level}</span>
              <span className="lv-rule">{discount > 0 ? `${discount * 100}% de desconto` : "acumula pontos"}</span>
              <b>{clientsPerLevel[level]}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FraudAlerts({ alerts, onCheckAlert }) {
  return (
    <div className="card">
      <h2>Antifraude</h2>
      {alerts.length === 0 && <p className="hint">Nenhum alerta hoje.</p>}

      <ul className="alerts">
        {alerts.map((alert) => (
          <li key={alert.id} className={alert.checked ? "ok" : ""}>
            <div className="al-main">
              <span className="al-ic">
                <Icon name={alert.checked ? "check" : "alert"} size={14} />
              </span>
              <span><b>{alert.register}</b> {alert.text}</span>
            </div>
            <small className="al-time">
              {alert.time}
              {alert.checked && " · verificado"}
            </small>
            {!alert.checked && (
              <button className="btn sm" onClick={() => onCheckAlert(alert)}>Verificar</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
