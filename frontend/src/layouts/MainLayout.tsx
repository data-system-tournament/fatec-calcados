import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SearchPalette } from "../components/layout/SearchPalette";
import { Sidebar } from "../components/layout/Sidebar";
import { tituloDaRota } from "../components/layout/navegacao";
import { passosDoTour } from "../components/layout/passosTour";
import { TourGuiado } from "../components/layout/TourGuiado";
import { STORE_NAME } from "../config";
import { AcoesProvider } from "../contexts/AcoesProvider";
import { CaixaProvider } from "../contexts/CaixaProvider";
import { ToastProvider } from "../contexts/ToastProvider";
import { useAtalhoBusca } from "../hooks/useAtalhoBusca";
import { useSidebar } from "../hooks/useSidebar";
import { useTour } from "../hooks/useTour";
import { todayLabel } from "../utils/format";

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
  const isPdv = useMatch("/pdv") !== null;
  const { pathname } = useLocation();
  const [searching, setSearching] = useState(false);
  const sidebar = useSidebar();
  const title = tituloDaRota(pathname);

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

  function handleSearch() {
    setSearching(true);
    sidebar.close();
  }

  return (
    <div className="flex min-h-full">
      {sidebar.mobile && sidebar.open && (
        <div className="fixed inset-0 z-30 bg-[rgba(9,9,11,.4)]" onClick={sidebar.close} aria-hidden="true" />
      )}

      {/* No desktop, "fechada" é a rail de ícones (nunca some). No celular é uma gaveta: fechada, fica
          inert, sem foco pelo teclado nem leitura por leitores de tela. */}
      <aside id="menu-lateral" className={asideClass} inert={sidebar.mobile && !sidebar.open}>
        <Sidebar
          collapsed={!sidebar.mobile && !sidebar.open}
          onSearch={handleSearch}
          onNavigate={sidebar.mobile ? sidebar.close : undefined}
          onTour={tour.iniciar}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-6 py-2 backdrop-blur-[10px] backdrop-saturate-[1.4] max-[860px]:px-4">
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
            <span className="truncate font-medium text-ink">{title}</span>
          </div>

          <span className="ml-auto text-[13px] text-muted max-[860px]:hidden">{todayLabel()}</span>
        </header>

        <main
          className={`w-full min-w-0 flex-1 px-6 pt-6 max-[860px]:px-4 max-[860px]:pt-[18px] ${isPdv ? "pb-[18px]" : "pb-10"}`}
        >
          <Outlet />
        </main>
      </div>

      {searching && <SearchPalette onClose={() => setSearching(false)} />}

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
