import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { PainelAcessibilidade } from "../components/layout/PainelAcessibilidade";
import { PainelAjuda } from "../components/layout/PainelAjuda";
import { SearchPalette } from "../components/layout/SearchPalette";
import { Sidebar, StatusDoCaixa, type AvisoDaRota } from "../components/layout/Sidebar";
import { tituloDaRota, type Rota } from "../components/layout/navegacao";
import { passosDoTour } from "../components/layout/passosTour";
import { TourGuiado } from "../components/layout/TourGuiado";
import { STORE_NAME } from "../config";
import { useAcoes } from "../contexts/acoes";
import { AcoesProvider } from "../contexts/AcoesProvider";
import { useCaixa } from "../contexts/caixa";
import { CaixaProvider } from "../contexts/CaixaProvider";
import { ToastProvider } from "../contexts/ToastProvider";
import { useAtalhoBusca } from "../hooks/useAtalhoBusca";
import { useSidebar } from "../hooks/useSidebar";
import { useTituloDaRota } from "../hooks/useTituloDaRota";
import { useTour } from "../hooks/useTour";

// Data do cabeçalho: "Sexta-feira, 26 de setembro".
function todayLabel(): string {
  const text = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text[0].toUpperCase() + text.slice(1);
}

function MainLayout() {
  return (
    <ToastProvider>
      <CaixaProvider>
        <AcoesProvider>
          <Shell />
        </AcoesProvider>
      </CaixaProvider>
    </ToastProvider>
  );
}

// Escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas classes em conflito vence.
const asideDesktop = "sticky top-0 h-dvh flex-none self-start border-r border-line bg-surface transition-[width] duration-200";
const asideMobile = "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-line bg-surface shadow-pop transition-transform duration-300";

function Shell() {
  const isPdv = useMatch("/admin/pdv") !== null;
  const { pathname } = useLocation();
  const [searching, setSearching] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const sidebar = useSidebar();
  const title = tituloDaRota(pathname);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useTituloDaRota(title, titleRef);

  useAtalhoBusca(() => setSearching(true));

  const passosTour = useMemo(() => passosDoTour(), []);
  const tour = useTour(passosTour.length);

  // No celular a sidebar é uma gaveta: o tour a abre e, ao terminar, a fecha de novo.
  const { mobile, openDrawer, close } = sidebar;
  useEffect(() => {
    if (!tour.ativo || !mobile) return;
    openDrawer();
    return close;
  }, [tour.ativo, mobile, openDrawer, close]);

  const asideClass = sidebar.mobile
    ? `${asideMobile} ${sidebar.open ? "translate-x-0" : "-translate-x-full"}`
    : `${asideDesktop} ${sidebar.open ? "w-[260px]" : "w-16"}`;

  // PDV offline e ações pendentes aparecem ao lado do nome na sidebar.
  const { online } = useCaixa();
  const { openCount } = useAcoes();
  function avisoDaRota(rota: Rota): AvisoDaRota | undefined {
    if (rota.to === "/admin/pdv" && !online) return { etiqueta: "offline", descricao: "offline" };
    if (rota.to === "/admin/acoes" && openCount > 0) return { contador: openCount, descricao: `${openCount} pendentes` };
  }

  function handleSearch() {
    setSearching(true);
    sidebar.close();
  }

  return (
    <div className="flex min-h-full">
      {/* Primeira parada do Tab: pula a sidebar e vai direto para a tela. Só aparece ao receber foco. */}
      <a
        href="#conteudo"
        className="sr-only print:hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-surface focus:shadow-pop"
      >
        Pular para o conteúdo
      </a>

      {sidebar.mobile && sidebar.open && (
        <div className="fixed inset-0 z-30 bg-[rgba(9,9,11,.4)]" onClick={sidebar.close} aria-hidden="true" />
      )}

      {/* No desktop, "fechada" é a rail de ícones (nunca some). No celular é uma gaveta: fechada, fica
          inert, sem foco pelo teclado nem leitura por leitores de tela. */}
      <aside id="menu-lateral" className={`${asideClass} print:hidden`} inert={sidebar.mobile && !sidebar.open}>
        <Sidebar
          collapsed={!sidebar.mobile && !sidebar.open}
          avisoDaRota={avisoDaRota}
          status={(collapsed) => <StatusDoCaixa collapsed={collapsed} />}
          onSearch={handleSearch}
          onNavigate={sidebar.mobile ? sidebar.close : undefined}
          onTour={tour.iniciar}
          onAjuda={() => setAjuda(true)}
          onAcessibilidade={() => setAjustando(true)}
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
            <span className="truncate max-[860px]:hidden">{STORE_NAME}</span>
            {title && <span aria-hidden="true" className="max-[860px]:hidden">/</span>}
            {/* O <h1> de cada tela: recebe o foco quando a rota muda (ver useTituloDaRota). */}
            {title && <h1 ref={titleRef} tabIndex={-1} className="truncate font-medium text-ink outline-none">{title}</h1>}
          </div>

          <span className="ml-auto text-[13px] text-muted max-[860px]:hidden">{todayLabel()}</span>
        </header>

        <main
          id="conteudo"
          tabIndex={-1}
          className={`w-full min-w-0 flex-1 px-6 pt-6 outline-none max-[860px]:px-4 max-[860px]:pt-[18px] ${isPdv ? "pb-[18px]" : "pb-10"}`}
        >
          <Outlet />
        </main>
      </div>

      {searching && <SearchPalette onClose={() => setSearching(false)} />}

      {/* No celular a gaveta fica aberta por baixo: é nela que o foco volta quando o painel fecha. */}
      {ajustando && <PainelAcessibilidade onClose={() => setAjustando(false)} />}
      {ajuda && <PainelAjuda publico="loja" onClose={() => setAjuda(false)} />}

      {tour.ativo && (
        <TourGuiado
          passos={passosTour}
          passo={tour.passo}
          onProximo={tour.proximo}
          onAnterior={tour.anterior}
          onPular={tour.encerrar}
        />
      )}
    </div>
  );
}

export default MainLayout;
