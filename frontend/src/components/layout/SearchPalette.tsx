import { useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { useCarregar } from "../../hooks/useCarregar";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchClients } from "../../services/api";
import { formatNumber } from "../../utils/format";
import { Kbd } from "../ui/Kbd";
import { ROTAS } from "./navegacao";

type Resultado = { id: string; section: string; label: string; hint?: string; to: string; icon?: LucideIcon };

const MIN_CLIENT_SEARCH = 2;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Feito com IA: paleta de busca (Ctrl/⌘ K). Sem consulta, lista as telas; com 2+ letras, filtra as telas
// e busca clientes na API (a mesma busca da tela Clientes, com o CPF já mascarado pelo backend).
// O foco fica sempre no campo: as opções são escolhidas com aria-activedescendant, sem virar tab stops.
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Feito com IA: guardado durante a renderização, antes do autoFocus, para devolver o foco a quem abriu.
  const [opener] = useState(() => document.activeElement);

  const term = useDebounce(query.trim(), 250);
  const searchClients = term.length >= MIN_CLIENT_SEARCH;
  const { data, error, loading } = useCarregar(
    () => (searchClients ? fetchClients({ search: term, page: 1 }) : Promise.resolve(null)),
    searchClients ? term : "",
  );

  const pages: Resultado[] = ROTAS.filter((rota) => !query.trim() || normalize(rota.title).includes(normalize(query.trim()))).map(
    (rota) => ({ id: rota.to, section: "Ir para", label: rota.title, to: rota.to, icon: rota.icon }),
  );
  const clients: Resultado[] = searchClients
    ? (data?.clients ?? []).slice(0, 5).map((c) => ({
        id: `cliente-${c.id}`,
        section: "Clientes",
        label: c.name,
        hint: `${c.cpf} · ${c.level} · ${formatNumber(c.points)} pts`,
        to: `/clientes/${c.id}`,
      }))
    : [];
  const results = [...pages, ...clients];
  const current = Math.min(active, results.length - 1);
  const waitingClients = searchClients && (loading || term !== query.trim());

  function close() {
    onClose();
    if (opener instanceof HTMLElement) opener.focus();
  }

  function open(result: Resultado) {
    navigate(result.to);
    onClose();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setActive(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + results.length) % results.length);
    } else if (event.key === "Enter" && results[current]) {
      event.preventDefault();
      open(results[current]);
    } else if (event.key === "Tab") {
      // O campo é o único elemento focável do diálogo.
      event.preventDefault();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(9,9,11,.4)] px-4 pt-[15vh] backdrop-blur-[2px]"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="w-full max-w-xl animate-pop overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} strokeWidth={1.5} className="flex-none text-faint" aria-hidden="true" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="resultados-busca"
            aria-activedescendant={results[current] ? `busca-${results[current].id}` : undefined}
            aria-label="Buscar telas e clientes"
            value={query}
            onChange={handleChange}
            placeholder="Buscar telas ou clientes (nome ou CPF)..."
            className="flex-1 bg-transparent py-4 text-sm text-ink outline-none placeholder:text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div id="resultados-busca" role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-2">
          {["Ir para", "Clientes"].map((section) => {
            const items = results.filter((r) => r.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section} role="group" aria-label={section} className="mb-1">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{section}</div>
                {items.map((result) => {
                  const isCurrent = results[current]?.id === result.id;
                  return (
                    <div
                      key={result.id}
                      id={`busca-${result.id}`}
                      role="option"
                      aria-selected={isCurrent}
                      onMouseMove={() => setActive(results.indexOf(result))}
                      onClick={() => open(result)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] ${isCurrent ? "bg-subtle text-ink" : "text-ink-2"}`}
                    >
                      {result.icon && <result.icon size={16} strokeWidth={1.5} className="flex-none text-muted" aria-hidden="true" />}
                      <span className="truncate font-medium">{result.label}</span>
                      {result.hint && <span className="truncate text-xs text-muted">{result.hint}</span>}
                      {isCurrent && <CornerDownLeft size={14} className="ml-auto flex-none text-faint" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {waitingClients && <p className="px-2.5 py-2 text-[13px] text-muted" role="status">Buscando clientes...</p>}
          {searchClients && error && !waitingClients && (
            <p className="px-2.5 py-2 text-[13px] text-danger" role="status">Não foi possível buscar clientes agora.</p>
          )}
          {!waitingClients && !error && results.length === 0 && (
            <p className="px-2.5 py-6 text-center text-[13px] text-muted" role="status">Nada encontrado para “{query.trim()}”.</p>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-bg px-4 py-2.5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> abrir</span>
        </div>
      </div>
    </div>
  );
}
