import type { ComponentType, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { CircleHelp, House, PersonStanding, Search } from "lucide-react";
import { REGISTER_NAME, STORE_NAME } from "../../config";
import { useAcoes } from "../../contexts/acoes";
import { useCaixa } from "../../contexts/caixa";
import { plural } from "../../utils/format";
import { Kbd } from "../ui/Kbd";
import { Led } from "../ui/Led";
import { Pill } from "../ui/Pill";
import { atalhoBusca, GRUPOS, type Rota } from "./navegacao";

// Classes escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas em conflito vence.
const itemExpandido =
  "group relative flex w-full items-center justify-between gap-2 rounded-[6px] px-2.5 py-[7px] text-left text-[13px] transition-colors duration-200 select-none";
const itemRecolhido =
  "group relative mx-auto flex size-10 items-center justify-center rounded-[6px] transition-colors duration-200 select-none";
const itemAtivo = "bg-subtle font-medium text-ink";
const itemInativo = "text-muted hover:bg-subtle hover:text-ink";

// Feito com IA: layout do componente de sidebar do shadcn adaptado ao projeto (tokens bg-surface/text-ink/
// border-line no lugar de card/foreground, sem classes dark:, e NavLink no lugar do estado interno).
// `collapsed` é a "rail": só os ícones, com o nome em title/aria-label; a sidebar nunca sai da tela.
export function Sidebar({ collapsed = false, onSearch, onNavigate, onTour, onAcessibilidade }: {
  collapsed?: boolean;
  onSearch: () => void;
  onNavigate?: () => void;
  onTour: () => void;
  onAcessibilidade: () => void;
}) {
  const itemClass = collapsed ? itemRecolhido : itemExpandido;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-3">
      <div className={`mb-4 flex items-center py-2 ${collapsed ? "justify-center" : "gap-3 px-2"}`}>
        <span className="grid size-8 flex-none place-items-center rounded-[6px] bg-ink text-[13px] font-semibold text-accent shadow-card">F</span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <b className="mb-1 text-[13px] leading-none font-medium">FATECalçados</b>
            <small className="truncate text-[11px] leading-none text-muted">{STORE_NAME}</small>
          </div>
        )}
      </div>

      <nav aria-label="Seções" className="mt-2 flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GRUPOS.map((grupo, index) => (
          <div key={grupo.heading ?? index} className="flex flex-col gap-0.5">
            {index === 0 && <SearchButton collapsed={collapsed} itemClass={itemClass} onClick={onSearch} />}
            {grupo.heading &&
              (collapsed ? (
                <hr className="mx-2 mb-1 border-line" aria-hidden="true" />
              ) : (
                <span className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{grupo.heading}</span>
              ))}
            {grupo.rotas.map((rota) => (
              <RouteLink key={rota.to} rota={rota} collapsed={collapsed} itemClass={itemClass} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
        <ConnectionStatus collapsed={collapsed} />
        <button
          type="button"
          onClick={onAcessibilidade}
          data-tour="acessibilidade"
          title={collapsed ? "Acessibilidade" : undefined}
          aria-label={collapsed ? "Acessibilidade" : undefined}
          aria-haspopup="dialog"
          className={`${itemClass} ${itemInativo}`}
        >
          <ItemBody icon={PersonStanding} title="Acessibilidade" active={false} collapsed={collapsed} />
        </button>
        <button
          type="button"
          onClick={onTour}
          title={collapsed ? "Rever o tour" : undefined}
          aria-label={collapsed ? "Rever o tour" : undefined}
          className={`${itemClass} ${itemInativo}`}
        >
          <ItemBody icon={CircleHelp} title="Rever o tour" active={false} collapsed={collapsed} />
        </button>
        <Link
          to="/"
          onClick={onNavigate}
          title={collapsed ? "Página inicial" : undefined}
          aria-label={collapsed ? "Página inicial" : undefined}
          className={`${itemClass} ${itemInativo}`}
        >
          <ItemBody icon={House} title="Página inicial" active={false} collapsed={collapsed} />
        </Link>
      </div>
    </div>
  );
}

function ItemBody({ icon: Icon, title, active, collapsed, trailing, alert = false }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  active: boolean;
  collapsed: boolean;
  trailing?: ReactNode;
  // Só na rail: bolinha no canto do ícone no lugar do contador (pendências, caixa offline).
  alert?: boolean;
}) {
  const iconClass = active ? "text-ink" : "text-faint transition-colors group-hover:text-ink-2";

  if (collapsed) {
    return (
      <>
        <Icon size={18} strokeWidth={1.5} className={iconClass} />
        {alert && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent-ink ring-2 ring-surface" />}
      </>
    );
  }

  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={16} strokeWidth={1.5} className={iconClass} />
        <span className="truncate tracking-wide">{title}</span>
      </span>
      {trailing}
    </>
  );
}

function SearchButton({ collapsed, itemClass, onClick }: { collapsed: boolean; itemClass: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour="busca"
      title={collapsed ? `Buscar (${atalhoBusca()})` : undefined}
      aria-label={collapsed ? "Buscar" : undefined}
      className={`${itemClass} ${itemInativo}`}
    >
      <ItemBody
        icon={Search}
        title="Buscar"
        active={false}
        collapsed={collapsed}
        trailing={<Kbd className="hidden group-hover:inline-block">{atalhoBusca()}</Kbd>}
      />
    </button>
  );
}

function RouteLink({ rota, collapsed, itemClass, onNavigate }: {
  rota: Rota;
  collapsed: boolean;
  itemClass: string;
  onNavigate?: () => void;
}) {
  const { online } = useCaixa();
  const { openCount } = useAcoes();

  const offline = rota.to === "/pdv" && !online;
  const pending = rota.to === "/acoes" ? openCount : 0;
  // Na rail o nome e o aviso vão para o title e o aria-label, já que não há texto na tela.
  const label = offline ? `${rota.title} (offline)` : pending > 0 ? `${rota.title} (${pending} pendentes)` : rota.title;

  return (
    <NavLink
      to={rota.to}
      onClick={onNavigate}
      data-tour={rota.to}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => `${itemClass} ${isActive ? itemAtivo : itemInativo}`}
    >
      {({ isActive }) => (
        <ItemBody
          icon={rota.icon}
          title={rota.title}
          active={isActive}
          collapsed={collapsed}
          alert={offline || pending > 0}
          trailing={
            <>
              {offline && <Pill tone="warn">offline</Pill>}
              {pending > 0 && <Pill tone={isActive ? "inverted" : "neutral"}>{pending}</Pill>}
            </>
          }
        />
      )}
    </NavLink>
  );
}

function ConnectionStatus({ collapsed }: { collapsed: boolean }) {
  const { online, pendingSales } = useCaixa();

  const text = online
    ? `${REGISTER_NAME} conectado`
    : `${REGISTER_NAME} offline · ${pendingSales} ${plural(pendingSales, "pendente", "pendentes")}`;
  const led = online ? <Led on /> : <i className="inline-block size-[7px] flex-none rounded-full bg-accent-ink" />;

  if (collapsed) {
    return (
      <div data-tour="conexao" className="flex h-10 items-center justify-center" role="status" title={text} aria-label={text}>
        {led}
      </div>
    );
  }

  return (
    <div data-tour="conexao" className="flex items-center gap-2.5 px-2.5 py-[7px] text-xs text-muted" role="status">
      {led}
      <span>{text}</span>
    </div>
  );
}
