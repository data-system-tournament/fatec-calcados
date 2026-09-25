import type { SalesGroup } from "../../types";
import { formatMoney, formatNumber, formatPercent, plural } from "../../utils/format";
import { TONS } from "./tons";

// Lista de grupos de vendas (forma de pagamento, caixa) com uma barra proporcional ao faturamento de cada um.
// `colunas` deixa listas longas, como a dos caixas, correrem em mais de uma coluna.
function BarrasDeVendas({ groups, colunas = "" }: { groups: SalesGroup[]; colunas?: string }) {
  return (
    <ul className={`grid gap-x-8 gap-y-4 ${colunas}`}>
      {groups.map((group) => (
        <li key={group.name} className="min-w-0 text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate" title={group.name}>{group.name}</span>
            <span className="flex-none text-muted">
              <b className="font-semibold text-ink">{formatMoney(group.revenue)}</b> · {formatPercent(group.percent)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
            <div className={`h-full rounded-full ${TONS.ciano.barra}`} style={{ width: `${group.percent}%` }} />
          </div>
          <small className="mt-1 block text-xs text-muted">{formatNumber(group.count)} {plural(group.count, "venda", "vendas")}</small>
        </li>
      ))}
    </ul>
  );
}

export default BarrasDeVendas;
