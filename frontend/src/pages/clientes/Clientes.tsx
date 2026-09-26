import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { Pagination } from "../../components/ui/Pagination";
import { hintClass, inputClass, tdClass, thClass } from "../../components/ui/styles";
import { useCarregar } from "../../hooks/useCarregar";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchClients } from "../../services/api";
import { formatDay, formatNumber } from "../../utils/format";

const LEVEL_FILTERS = [
  { code: "", label: "Todos os níveis" },
  { code: "BRONZE", label: "Bronze" },
  { code: "PRATA", label: "Prata" },
  { code: "OURO", label: "Ouro" },
];

// Feito com IA: busca, nível e página ficam na URL (/clientes?busca=ana&nivel=PRATA&pagina=2).
// O texto da busca espera 300 ms sem digitar antes de ir para a URL, para não consultar a API a cada tecla.
function Clientes() {
  const [params, setParams] = useSearchParams();
  const search = params.get("busca") ?? "";
  const level = params.get("nivel") ?? "";
  const page = Number(params.get("pagina")) || 1;

  const [text, setText] = useState(search);
  const debouncedText = useDebounce(text);

  useEffect(() => {
    if (debouncedText === search) return;
    const next = new URLSearchParams(params);
    if (debouncedText) next.set("busca", debouncedText);
    else next.delete("busca");
    next.delete("pagina");
    setParams(next, { replace: true });
  }, [debouncedText, search, params, setParams]);

  const { data, error, loading, retry } = useCarregar(
    () => fetchClients({ search, level, page }),
    [search, level, page].join("|"),
  );

  function setLevel(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("nivel", value);
    else next.delete("nivel");
    next.delete("pagina");
    setParams(next);
  }

  function setPage(value: number) {
    const next = new URLSearchParams(params);
    next.set("pagina", String(value));
    setParams(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 max-w-[420px]">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input
            className={`${inputClass} w-full pl-9`}
            placeholder="Buscar por nome ou CPF"
            aria-label="Buscar cliente por nome ou CPF"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <select
          className={inputClass}
          aria-label="Filtrar por nível"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          {LEVEL_FILTERS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
      </div>

      {error && (
        <ErrorState
          title={data ? "Não foi possível atualizar a lista" : "Não foi possível carregar os clientes"}
          message={error}
          onRetry={retry}
        />
      )}
      {!data && !error && <p className={hintClass} role="status">Carregando os clientes...</p>}

      {data && (
        <Card className={`p-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          {data.clients.length === 0 ? (
            <p className={hintClass}>Nenhum cliente encontrado com esses filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={`${thClass} text-left`}>Cliente</th>
                    <th className={`${thClass} text-left`}>CPF</th>
                    <th className={`${thClass} text-left`}>Nível</th>
                    <th className={`${thClass} text-right`}>Saldo</th>
                    <th className={`${thClass} text-right`}>Compras</th>
                    <th className={`${thClass} text-right`}>Última compra</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {data.clients.map((client) => (
                    <tr key={client.id} className="hover:bg-subtle">
                      <td className={tdClass}>
                        <Link to={`/admin/clientes/${client.id}`} className="font-medium underline-offset-[3px] hover:underline">{client.name}</Link>
                      </td>
                      <td className={tdClass}>{client.cpf}</td>
                      <td className={tdClass}><LevelBadge level={client.level} /></td>
                      <td className={`${tdClass} text-right`}>{formatNumber(client.points)} pts</td>
                      <td className={`${tdClass} text-right`}>{client.purchases}</td>
                      <td className={`${tdClass} text-right`}>{client.lastPurchase ? formatDay(client.lastPurchase) : <span className="text-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={data.page} pages={data.pages} total={data.total} noun={["cliente", "clientes"]} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}

export default Clientes;
