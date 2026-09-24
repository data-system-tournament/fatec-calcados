import { useEffect, useState } from "react";
import PeriodFilter from "./components/PeriodFilter";
import Toast from "./components/Toast";
import { REGISTER_NAME, STORE_NAME } from "./config";
import Actions from "./pages/Actions";
import Dashboard from "./pages/Dashboard";
import Pdv from "./pages/Pdv";
import { useDashboard } from "./hooks/useDashboard";
import { fetchActions, fetchProducts, sendSale } from "./services/api";
import { plural, todayLabel } from "./utils/format";

const TOAST_DURATION_MS = 2800;

function App() {
  const [tab, setTab] = useState("dashboard");
  const [online, setOnline] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);
  const [newClientsToday, setNewClientsToday] = useState(0);

  const [period, setPeriod] = useState(null);
  const dashboard = useDashboard(period, tab === "dashboard");

  const [actions, setActions] = useState([]);
  const [doneActions, setDoneActions] = useState([]);

  function notify(message) {
    setToast({ id: crypto.randomUUID(), message });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function loadActions() {
    fetchActions()
      .then(setActions)
      .catch((error) => notify(`Não foi possível carregar as ações: ${error.message}`));
  }

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((error) => notify(`Não foi possível carregar os produtos: ${error.message}`));
    loadActions();
  }, []);

  function openTab(id) {
    setTab(id);
    if (id === "actions") loadActions();
  }

  const pendingSales = sales.filter((sale) => !sale.synced).length;

  // Feito com IA: online, envia a venda e usa os valores do backend; offline, guarda a venda
  // com `synced: false` para enviar depois.
  async function finishSale(sale) {
    if (!online) {
      const pendingSale = { ...sale, synced: false };
      setSales([...sales, pendingSale]);
      return pendingSale;
    }

    const result = await sendSale(sale);
    const recorded = { ...sale, total: result.total, points: result.pointsEarned, synced: true };
    setSales([...sales, recorded]);
    return recorded;
  }

  // Feito com IA: ao reconectar, envia as vendas pendentes uma por uma; as que falharem continuam pendentes.
  // O `id` de cada venda é gerado no caixa, então reenviar a mesma venda não duplica no backend.
  async function syncPendingSales() {
    let sent = 0;
    const updated = [];
    for (const sale of sales) {
      if (sale.synced) {
        updated.push(sale);
        continue;
      }
      try {
        const result = await sendSale(sale);
        updated.push({ ...sale, total: result.total, points: result.pointsEarned, synced: true });
        sent += 1;
      } catch {
        updated.push(sale);
      }
    }
    setSales(updated);

    const failed = pendingSales - sent;
    if (failed > 0) notify(`${failed} ${plural(failed, "venda não sincronizou", "vendas não sincronizaram")}. Tente reconectar de novo.`);
    else notify(`${sent} ${plural(sent, "venda sincronizada", "vendas sincronizadas")} com o painel`);
  }

  function toggleOnline() {
    if (online) {
      setOnline(false);
      notify(`${REGISTER_NAME} sem internet. Vendas continuam normalmente.`);
      return;
    }

    setOnline(true);
    if (pendingSales === 0) notify(`${REGISTER_NAME} online`);
    else syncPendingSales();
  }

  function clientRegistered(client) {
    setNewClientsToday(newClientsToday + 1);
    notify(`${client.name} cadastrado(a) no nível ${client.level}`);
  }

  function actionDone(type) {
    setDoneActions([...doneActions, type]);
  }

  let pointsRedeemedToday = 0;
  for (const sale of sales) {
    if (sale.synced) pointsRedeemedToday += sale.pointsToRedeem;
  }

  const openActions = actions.filter((a) => a.clients.length > 0 && !doneActions.includes(a.type)).length;
  const registers = [{ name: REGISTER_NAME, online, pending: pendingSales }];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">F</span>
          <div><b>FATECalçados</b><small>{STORE_NAME}</small></div>
        </div>
        <span className="topbar-date">{todayLabel()}</span>
        <div className={online ? "conn" : "conn off"}>
          <i className={online ? "led on" : "led off"} />
          <span>
            {online
              ? `${REGISTER_NAME} conectado`
              : `${REGISTER_NAME} offline · ${pendingSales} ${plural(pendingSales, "pendente", "pendentes")}`}
          </span>
        </div>
      </header>

      <main className={tab === "pdv" ? "main is-pdv" : "main"}>
        <div className="tabs-row">
          <nav className="tabs" role="tablist">
            <TabButton id="pdv" currentTab={tab} onSelect={openTab}>
              PDV / Caixa {!online && <span className="pill warn">offline</span>}
            </TabButton>
            <TabButton id="dashboard" currentTab={tab} onSelect={openTab}>Dashboard</TabButton>
            <TabButton id="actions" currentTab={tab} onSelect={openTab}>
              Ações {openActions > 0 && <span className="count">{openActions}</span>}
            </TabButton>
          </nav>
          {tab === "dashboard" && dashboard.data && (
            <PeriodFilter key={dashboard.data.start + dashboard.data.end} data={dashboard.data} onChange={setPeriod} />
          )}
        </div>

        {tab === "dashboard" && <Dashboard data={dashboard.data} error={dashboard.error} />}

        {tab === "actions" && (
          <Actions
            actions={actions}
            doneTypes={doneActions}
            onDone={actionDone}
            today={{ newClients: newClientsToday, pointsRedeemed: pointsRedeemedToday }}
            registers={registers}
            notify={notify}
          />
        )}

        {tab === "pdv" && (
          <Pdv
            online={online}
            onToggleOnline={toggleOnline}
            pending={pendingSales}
            products={products}
            onClientRegistered={clientRegistered}
            onFinishSale={finishSale}
            notify={notify}
          />
        )}
      </main>

      {toast && <Toast key={toast.id} message={toast.message} />}
    </div>
  );
}

function TabButton({ id, currentTab, onSelect, children }) {
  const active = id === currentTab;
  return (
    <button role="tab" aria-selected={active} className={active ? "on" : ""} onClick={() => onSelect(id)}>
      {children}
    </button>
  );
}

export default App;
