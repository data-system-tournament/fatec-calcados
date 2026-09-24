import { useEffect, useState } from "react";
import Toast from "./components/Toast";
import { LEVELS, REGISTER_NAME } from "./config";
import Actions from "./pages/Actions";
import Dashboard from "./pages/Dashboard";
import Pdv from "./pages/Pdv";
import { currentTime, plural, todayLabel } from "./utils/format";

const TOAST_DURATION_MS = 2800;

function App() {
  const [tab, setTab] = useState("dashboard");
  const [online, setOnline] = useState(true);
  const [sales, setSales] = useState([]);
  const [newClientsToday, setNewClientsToday] = useState(0);
  const [toast, setToast] = useState(null);

  // Tudo começa vazio: estes dados virão do backend.
  const [products] = useState([]);
  const [clients, setClients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [actions, setActions] = useState([]);
  const [automations, setAutomations] = useState({});
  const [rfm] = useState({});

  // Esconde a mensagem depois de alguns segundos
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function notify(message) {
    setToast({ id: crypto.randomUUID(), message });
  }

  const pendingSales = sales.filter((sale) => !sale.synced).length;

  function toggleOnline() {
    if (online) {
      setOnline(false);
      notify(`${REGISTER_NAME} sem internet. Vendas continuam normalmente.`);
      return;
    }

    setOnline(true);
    if (pendingSales === 0) {
      notify(`${REGISTER_NAME} online`);
      return;
    }
    setSales(sales.map((sale) => ({ ...sale, synced: true })));
    notify(`${pendingSales} ${plural(pendingSales, "venda sincronizada", "vendas sincronizadas")} com o painel`);
  }

  function finishSale(sale) {
    setSales([...sales, { ...sale, synced: online }]);

    if (sale.clientCpf) {
      setClients(clients.map((c) => (c.cpf === sale.clientCpf ? { ...c, points: c.points + sale.points } : c)));
    }
  }

  function registerClient(client) {
    setClients([...clients, client]);
    setNewClientsToday(newClientsToday + 1);
    notify(`${client.name} cadastrado(a) no nível Bronze`);
  }

  function raiseAlert(text) {
    const alert = { id: crypto.randomUUID(), register: REGISTER_NAME, text, time: currentTime(), checked: false };
    setAlerts([alert, ...alerts]);
    notify(`Alerta enviado ao antifraude: ${text}`);
  }

  function checkAlert(alert) {
    setAlerts(alerts.map((a) => (a.id === alert.id ? { ...a, checked: true } : a)));
    notify(`Alerta do ${alert.register} marcado como verificado`);
  }

  function finishAction(actionId, message) {
    setActions(actions.map((a) => (a.id === actionId ? { ...a, done: true, doneText: message } : a)));
    notify(message);
  }

  function toggleAutomation(name) {
    const active = automations[name];
    setAutomations({ ...automations, [name]: !active });
    notify(`Automação “${name}” ${active ? "pausada" : "ativada"}`);
  }

  const clientsPerLevel = {};
  for (const level of LEVELS) {
    clientsPerLevel[level] = clients.filter((c) => c.level === level).length;
  }

  const openAlerts = alerts.filter((a) => !a.checked).length;
  const openActions = actions.filter((a) => !a.done).length;
  const registers = [{ name: REGISTER_NAME, online, pending: pendingSales }];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">P</span>
          <div><b>Passo Certo</b><small>Loja Centro</small></div>
        </div>
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
            <TabButton id="dashboard" currentTab={tab} onSelect={setTab}>
              Dashboard {openAlerts > 0 && <span className="pill">{openAlerts}</span>}
            </TabButton>
            <TabButton id="actions" currentTab={tab} onSelect={setTab}>
              Ações {openActions > 0 && <span className="count">{openActions}</span>}
            </TabButton>
            <TabButton id="pdv" currentTab={tab} onSelect={setTab}>
              PDV / Caixa {!online && <span className="pill warn">offline</span>}
            </TabButton>
          </nav>
          {tab !== "pdv" && <span className="date">{todayLabel()}</span>}
        </div>

        {tab === "dashboard" && (
          <Dashboard
            sales={sales}
            alerts={alerts}
            onCheckAlert={checkAlert}
            clientsPerLevel={clientsPerLevel}
            rfm={rfm}
            notify={notify}
          />
        )}

        {tab === "actions" && (
          <Actions
            actions={actions}
            onActionDone={finishAction}
            automations={automations}
            onToggleAutomation={toggleAutomation}
            today={{ newClients: newClientsToday, pointsRedeemed: 0 }}
            registers={registers}
          />
        )}

        {tab === "pdv" && (
          <Pdv
            online={online}
            onToggleOnline={toggleOnline}
            pending={pendingSales}
            products={products}
            clients={clients}
            onRegisterClient={registerClient}
            onFinishSale={finishSale}
            onAlert={raiseAlert}
            notify={notify}
          />
        )}

        {tab !== "pdv" && (
          <footer className="foot">
            Em memória de [Nome] ·{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); notify("Página Sobre nós em construção"); }}>Sobre nós</a>
          </footer>
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
