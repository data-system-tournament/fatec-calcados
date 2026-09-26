import { useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Coins, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { PainelAcessibilidade } from "../components/layout/PainelAcessibilidade";
import { PainelAjuda } from "../components/layout/PainelAjuda";
import { Sidebar, type AvisoDaRota } from "../components/layout/Sidebar";
import { GRUPOS_CLIENTE, tituloDaRota, type Rota } from "../components/layout/navegacao";
import { ErrorState } from "../components/ui/ErrorState";
import { LevelBadge } from "../components/ui/LevelBadge";
import { hintClass } from "../components/ui/styles";
import { useConta } from "../contexts/conta";
import { ContaProvider } from "../contexts/ContaProvider";
import { ToastProvider } from "../contexts/ToastProvider";
import { useNotificacoes } from "../hooks/useNotificacoes";
import { useSidebar } from "../hooks/useSidebar";
import { useTituloDaRota } from "../hooks/useTituloDaRota";
import { PainelNotificacoes } from "../pages/conta/PainelNotificacoes";
import type { ClientDashboard } from "../types";
import { formatNumber, plural } from "../utils/format";

// Área do cliente (/loja e /minha-conta): a mesma sidebar e o mesmo cabeçalho da loja, com as telas do cliente.
// Sem sessão, manda para /login.
function ClienteLayout() {
  return (
    <ToastProvider>
      <ContaProvider>
        <Shell />
      </ContaProvider>
    </ToastProvider>
  );
}

// As mesmas classes do MainLayout (escolhidas por inteiro, não somadas).
const asideDesktop = "sticky top-0 h-dvh flex-none self-start border-r border-line bg-surface transition-[width] duration-200";
const asideMobile = "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-line bg-surface shadow-pop transition-transform duration-300";

function Shell() {
  const { account, loading, error, reload } = useConta();

  if (loading) {
    return <p className={`${hintClass} p-6`} role="status">Carregando sua conta...</p>;
  }
  if (error && !account) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <ErrorState title="Não foi possível carregar sua conta" message={error} onRetry={reload} />
      </div>
    );
  }
  if (!account) return <Navigate to="/login" replace />;
  return <ShellLogado account={account} />;
}

// Só monta com a sessão carregada: as notificações (e o "lido" de cada uma) são do cliente logado.
function ShellLogado({ account }: { account: ClientDashboard }) {
  const { signOut, cart } = useConta();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ajustando, setAjustando] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  // As que eram novas quando o painel abriu: continuam marcadas enquanto ele estiver aberto.
  const [avisosNovos, setAvisosNovos] = useState<string[] | null>(null);
  const avisos = useNotificacoes(account);
  const sidebar = useSidebar();
  const title = tituloDaRota(pathname, GRUPOS_CLIENTE);
  const secao = pathname.startsWith("/minha-conta") ? "Minha conta" : "Loja online";
  const titleRef = useRef<HTMLHeadingElement>(null);

  useTituloDaRota(title, titleRef);

  let itensNoCarrinho = 0;
  for (const item of cart) itensNoCarrinho += item.quantity;

  function avisoDaRota(rota: Rota): AvisoDaRota | undefined {
    if (rota.to === "/loja/carrinho" && itensNoCarrinho > 0) {
      return { contador: itensNoCarrinho, descricao: `${itensNoCarrinho} ${plural(itensNoCarrinho, "item", "itens")}` };
    }
  }

  async function sair() {
    await signOut();
    navigate("/login");
  }

  const asideClass = sidebar.mobile
    ? `${asideMobile} ${sidebar.open ? "translate-x-0" : "-translate-x-full"}`
    : `${asideDesktop} ${sidebar.open ? "w-[260px]" : "w-16"}`;

  return (
    <div className="flex min-h-full">
      <a
        href="#conteudo"
        className="sr-only print:hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-surface focus:shadow-pop"
      >
        Pular para o conteúdo
      </a>

      {sidebar.mobile && sidebar.open && (
        <div className="fixed inset-0 z-30 bg-[rgba(9,9,11,.4)]" onClick={sidebar.close} aria-hidden="true" />
      )}

      <aside id="menu-lateral" className={`${asideClass} print:hidden`} inert={sidebar.mobile && !sidebar.open}>
        <Sidebar
          collapsed={!sidebar.mobile && !sidebar.open}
          grupos={GRUPOS_CLIENTE}
          subtitulo="Área do cliente"
          avisoDaRota={avisoDaRota}
          status={(collapsed) => <StatusDoCliente account={account} collapsed={collapsed} />}
          notificacoes={{
            naoLidas: avisos.naoLidas.length,
            onAbrir: () => {
              if (sidebar.mobile) sidebar.close();
              setAvisosNovos(avisos.naoLidas);
              avisos.marcarComoLidas();
            },
          }}
          onNavigate={sidebar.mobile ? sidebar.close : undefined}
          onAjuda={() => setAjuda(true)}
          onAcessibilidade={() => setAjustando(true)}
          onSair={sair}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-6 py-2 backdrop-blur-[10px] backdrop-saturate-[1.4] max-[860px]:px-4 print:hidden">
          <button
            type="button"
            onClick={sidebar.toggle}
            aria-label={sidebar.open ? "Recolher o menu lateral" : "Expandir o menu lateral"}
            aria-expanded={sidebar.open}
            aria-controls="menu-lateral"
            className="grid size-8 flex-none place-items-center rounded-md text-muted hover:bg-subtle hover:text-ink"
          >
            {sidebar.open ? <PanelLeftClose size={18} strokeWidth={1.5} /> : <PanelLeftOpen size={18} strokeWidth={1.5} />}
          </button>

          <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <span className="truncate max-[860px]:hidden">{secao}</span>
            {title && <span aria-hidden="true" className="max-[860px]:hidden">/</span>}
            {title && <h1 ref={titleRef} tabIndex={-1} className="truncate font-medium text-ink outline-none">{title}</h1>}
          </div>

          <span className="ml-auto flex items-center gap-2 text-[13px] text-muted">
            <LevelBadge level={account.level} />
            <span className="tabular-nums">{formatNumber(account.points)} pts</span>
          </span>
        </header>

        <main id="conteudo" tabIndex={-1} className="w-full min-w-0 flex-1 px-6 pt-6 pb-10 outline-none max-[860px]:px-4 max-[860px]:pt-[18px]">
          <Outlet />
        </main>
      </div>

      {ajustando && <PainelAcessibilidade onClose={() => setAjustando(false)} />}
      {ajuda && <PainelAjuda publico="cliente" onClose={() => setAjuda(false)} />}
      {avisosNovos && (
        <PainelNotificacoes notificacoes={avisos.notificacoes} novas={avisosNovos} onClose={() => setAvisosNovos(null)} />
      )}
    </div>
  );
}

// No lugar do status do caixa: quem está logado e quantos pontos tem.
function StatusDoCliente({ account, collapsed }: { account: ClientDashboard; collapsed: boolean }) {
  const text = `${account.name} · ${account.level} · ${formatNumber(account.points)} pts`;

  if (collapsed) {
    return (
      <div className="flex h-10 items-center justify-center text-faint" role="status" title={text} aria-label={text}>
        <Coins size={16} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-[7px] text-xs text-muted" role="status">
      <Coins size={14} strokeWidth={1.5} className="flex-none text-app" />
      <span className="truncate">
        {account.name.split(" ")[0]} · {formatNumber(account.points)} pts
      </span>
    </div>
  );
}

export default ClienteLayout;
