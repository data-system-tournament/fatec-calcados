import { useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Pagination } from "../../components/ui/Pagination";
import { hintClass, inputClass, tdClass, thClass } from "../../components/ui/styles";
import { paymentLabel } from "../../config";
import { useCarregar } from "../../hooks/useCarregar";
import { fetchSales } from "../../services/api";
import { formatDateTime, formatMoney, formatNumber } from "../../utils/format";
import SaleDetailModal from "./SaleDetailModal";

const selectClass = `${inputClass} py-[5px] text-[12.5px]`;

// Feito com IA: os filtros e a página ficam na URL (/vendas?pagamento=PIX&pagina=2), como no dashboard,
// então dá para recarregar ou mandar o link sem perder a lista.
function Vendas() {
  const [params, setParams] = useSearchParams();
  const start = params.get("inicio") ?? "";
  const end = params.get("fim") ?? "";
  const register = params.get("caixa") ?? "";
  const payment = params.get("pagamento") ?? "";
  const page = Number(params.get("pagina")) || 1;
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, error, loading, retry } = useCarregar(
    () => fetchSales({ start, end, register, payment, page }),
    [start, end, register, payment, page].join("|"),
  );

  // Trocar um filtro volta para a primeira página.
  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("pagina");
    setParams(next);
  }

  function setPage(next: number) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("pagina", String(next));
    setParams(nextParams);
  }

  const onSelect = (name: string) => (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFilter(name, event.target.value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-[3px] text-xs text-muted">
          De <input type="date" className={selectClass} value={start} onChange={onSelect("inicio")} />
        </label>
        <label className="flex flex-col gap-[3px] text-xs text-muted">
          Até <input type="date" className={selectClass} value={end} onChange={onSelect("fim")} />
        </label>
        <label className="flex flex-col gap-[3px] text-xs text-muted">
          Caixa
          <select className={selectClass} value={register} onChange={onSelect("caixa")}>
            <option value="">Todos</option>
            {data?.filters.registers.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-[3px] text-xs text-muted">
          Pagamento
          <select className={selectClass} value={payment} onChange={onSelect("pagamento")}>
            <option value="">Todos</option>
            {data?.filters.payments.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        {(start || end || register || payment) && (
          <button className="pb-1.5 text-[12.5px] font-medium text-muted underline underline-offset-[3px] hover:text-ink" onClick={() => setParams({})}>
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <ErrorState
          title={data ? "Não foi possível atualizar a lista" : "Não foi possível carregar as vendas"}
          message={error}
          onRetry={retry}
        />
      )}
      {!data && !error && <p className={hintClass} role="status">Carregando as vendas...</p>}

      {data && (
        <Card className={`p-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <p className="mb-3.5 text-[13px] text-muted">
            <b className="font-semibold text-ink">{formatMoney(data.revenue)}</b> em {formatNumber(data.total)} vendas
            {data.discount > 0 && <> · {formatMoney(data.discount)} em descontos com pontos</>}
          </p>

          {data.sales.length === 0 ? (
            <p className={hintClass}>Nenhuma venda com esses filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={`${thClass} text-left`}>Data</th>
                    <th className={`${thClass} text-left`}>Cliente</th>
                    <th className={`${thClass} text-left`}>Caixa</th>
                    <th className={`${thClass} text-left`}>Pagamento</th>
                    <th className={`${thClass} text-right`}>Itens</th>
                    <th className={`${thClass} text-right`}>Valor pago</th>
                    <th className={`${thClass} text-right`}>Pontos</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {data.sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-subtle">
                      <td className={tdClass}>
                        <button
                          className="font-medium underline-offset-[3px] hover:underline"
                          onClick={() => setOpenId(sale.id)}
                          aria-label={`Ver venda de ${formatDateTime(sale.date)}`}
                        >
                          {formatDateTime(sale.date)}
                        </button>
                      </td>
                      <td className={tdClass}>
                        {sale.client
                          ? <Link to={`/admin/clientes/${sale.client.id}`} className="underline-offset-[3px] hover:underline">{sale.client.name}</Link>
                          : <span className="text-muted">Sem CPF</span>}
                      </td>
                      <td className={tdClass}>{sale.register ?? "—"}</td>
                      <td className={tdClass}>{paymentLabel(sale.payment)}</td>
                      <td className={`${tdClass} text-right`}>{sale.itemCount}</td>
                      <td className={`${tdClass} text-right`}>{formatMoney(sale.paid)}</td>
                      <td className={`${tdClass} text-right`}>
                        {sale.pointsEarned > 0 && <span className="text-ok">+{formatNumber(sale.pointsEarned)}</span>}
                        {sale.pointsRedeemed > 0 && <span className="ml-1.5 text-danger">−{formatNumber(sale.pointsRedeemed)}</span>}
                        {sale.pointsEarned === 0 && sale.pointsRedeemed === 0 && <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={data.page} pages={data.pages} total={data.total} noun={["venda", "vendas"]} onChange={setPage} />
        </Card>
      )}

      {openId && <SaleDetailModal saleId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default Vendas;
