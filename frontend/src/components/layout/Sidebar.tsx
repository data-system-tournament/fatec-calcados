import type { ComponentType, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { CircleHelp, House, LogOut, PersonStanding, Search } from "lucide-react";
import { REGISTER_NAME, STORE_NAME } from "../../config";
import { useCaixa } from "../../contexts/caixa";
import { plural } from "../../utils/format";
import { Kbd } from "../ui/Kbd";
import { Led } from "../ui/Led";
import { Pill } from "../ui/Pill";
import { atalhoBusca, GRUPOS, type GrupoDeRotas, type Rota } from "./navegacao";

// Classes escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas em conflito vence.
const itemExpandido =
  "group relative flex w-full items-center justify-between gap-2 rounded-[6px] px-2.5 py-[7px] text-left text-[13px] transition-colors duration-200 select-none";
const itemRecolhido =
  "group relative mx-auto flex size-10 items-center justify-center rounded-[6px] transition-colors duration-200 select-none";
// O fundo do item ativo vem da cor da tela (rota.cor.ativo).
const itemAtivo = "font-medium text-ink";
const itemInativo = "text-muted hover:bg-subtle hover:text-ink";

// Feito com IA: layout do componente de sidebar do shadcn adaptado ao projeto (tokens bg-surface/text-ink/
// border-line no lugar de card/foreground, sem classes dark:, e NavLink no lugar do estado interno).
// `collapsed` é a "rail": só os ícones, com o nome em title/aria-label; a sidebar nunca sai da tela.
// A mesma sidebar serve à loja (padrão) e à área do cliente: quem monta passa as rotas, o subtítulo,
// os avisos de cada rota, o bloco de status do rodapé e só as ações que existem naquele layout.
export function Sidebar({
  collapsed = false,
  grupos = GRUPOS,
  subtitulo = STORE_NAME,
  avisoDaRota,
  status,
  onSearch,
  onNavigate,
  onTour,
  onAcessibilidade,
  onSair,
}: {
  collapsed?: boolean;
  grupos?: GrupoDeRotas[];
  subtitulo?: string;
  avisoDaRota?: (rota: Rota) => AvisoDaRota | undefined;
  status?: (collapsed: boolean) => ReactNode;
  onSearch?: () => void;
  onNavigate?: () => void;
  onTour?: () => void;
  onAcessibilidade: () => void;
  onSair?: () => void;
}) {
  const itemClass = collapsed ? itemRecolhido : itemExpandido;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-3">
      <div className={`mb-4 flex items-center py-2 ${collapsed ? "justify-center" : "gap-3 px-2"}`}>
        <img src="/fatec-icon.svg" alt="" className="size-8 flex-none object-contain" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <b className="mb-1 text-[13px] leading-none font-medium">FATECalçados</b>
            <small className="truncate text-[11px] leading-none text-muted">{subtitulo}</small>
          </div>
        )}
      </div>

      <nav aria-label="Seções" className="mt-2 flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {grupos.map((grupo, index) => (
          <div key={grupo.heading ?? index} className="flex flex-col gap-0.5">
            {index === 0 && onSearch && <SearchButton collapsed={collapsed} itemClass={itemClass} onClick={onSearch} />}
            {grupo.heading &&
              (collapsed ? (
                <hr className="mx-2 mb-1 border-line" aria-hidden="true" />
              ) : (
                <span className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{grupo.heading}</span>
              ))}
            {grupo.rotas.map((rota) => (
              <RouteLink
                key={rota.to}
                rota={rota}
                aviso={avisoDaRota?.(rota)}
                collapsed={collapsed}
                itemClass={itemClass}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
        {status?.(collapsed)}
        <button
          type="button"
          onClick={onAcessibilidade}
          data-tour="acessibilidade"
          title={collapsed ? "Aparência e acessibilidade" : undefined}
          aria-label={collapsed ? "Aparência e acessibilidade" : undefined}
          aria-haspopup="dialog"
          className={`${itemClass} ${itemInativo}`}
        >
          <ItemBody icon={PersonStanding} title="Aparência e acessibilidade" active={false} collapsed={collapsed} />
        </button>
        {onTour && (
          <button
            type="button"
            onClick={onTour}
            title={collapsed ? "Rever o tour" : undefined}
            aria-label={collapsed ? "Rever o tour" : undefined}
            className={`${itemClass} ${itemInativo}`}
          >
            <ItemBody icon={CircleHelp} title="Rever o tour" active={false} collapsed={collapsed} />
          </button>
        )}
        <Link
          to="/"
          onClick={onNavigate}
          title={collapsed ? "Página inicial" : undefined}
          aria-label={collapsed ? "Página inicial" : undefined}
          className={`${itemClass} ${itemInativo}`}
        >
          <ItemBody icon={House} title="Página inicial" active={false} collapsed={collapsed} />
        </Link>
        {onSair && (
          <button
            type="button"
            onClick={onSair}
            title={collapsed ? "Sair" : undefined}
            aria-label={collapsed ? "Sair" : undefined}
            className={`${itemClass} ${itemInativo}`}
          >
            <ItemBody icon={LogOut} title="Sair" active={false} collapsed={collapsed} />
          </button>
        )}
      </div>
    </div>
  );
}

function ItemBody({ icon: Icon, iconColor, title, active, collapsed, trailing, alert = false }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  // Cor fixa do ícone (cada tela tem a sua); sem ela o ícone fica cinza e escurece no hover.
  iconColor?: string;
  title: string;
  active: boolean;
  collapsed: boolean;
  trailing?: ReactNode;
  // Só na rail: bolinha no canto do ícone no lugar do contador (pendências, caixa offline).
  alert?: boolean;
}) {
  const iconClass = iconColor ?? (active ? "text-ink" : "text-faint transition-colors group-hover:text-ink-2");

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

// Aviso ao lado do nome da rota: `etiqueta` é um selo de alerta (ex.: "offline"), `contador` um número
// (ações pendentes, itens no carrinho) e `descricao` o que vai no title/aria-label da rail.
export type AvisoDaRota = { etiqueta?: string; contador?: number; descricao?: string };

function RouteLink({ rota, aviso, collapsed, itemClass, onNavigate }: {
  rota: Rota;
  aviso?: AvisoDaRota;
  collapsed: boolean;
  itemClass: string;
  onNavigate?: () => void;
}) {
  const etiqueta = aviso?.etiqueta;
  const contador = aviso?.contador ?? 0;
  // Na rail o nome e o aviso vão para o title e o aria-label, já que não há texto na tela.
  const label = aviso?.descricao ? `${rota.title} (${aviso.descricao})` : rota.title;

  return (
    <NavLink
      to={rota.to}
      end={rota.end}
      onClick={onNavigate}
      data-tour={rota.to}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => `${itemClass} ${isActive ? `${itemAtivo} ${rota.cor.ativo}` : itemInativo}`}
    >
      {({ isActive }) => (
        <ItemBody
          icon={rota.icon}
          iconColor={rota.cor.icone}
          title={rota.title}
          active={isActive}
          collapsed={collapsed}
          alert={Boolean(etiqueta) || contador > 0}
          trailing={
            <>
              {etiqueta && <Pill tone="warn">{etiqueta}</Pill>}
              {contador > 0 && <Pill tone={isActive ? "inverted" : "neutral"}>{contador}</Pill>}
            </>
          }
        />
      )}
    </NavLink>
  );
}

// Status do rodapé na loja: se o caixa está conectado e quantas vendas esperam para ser enviadas.
export function StatusDoCaixa({ collapsed }: { collapsed: boolean }) {
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
