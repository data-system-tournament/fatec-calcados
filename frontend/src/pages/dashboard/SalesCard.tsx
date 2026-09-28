import { Receipt } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import type { SalesSummary } from "../../types";
import { formatMoney, formatNumber, formatPercent, plural } from "../../utils/format";
import BarrasDeVendas from "./BarrasDeVendas";
import CardHeading from "./CardHeading";
import { TONS } from "./tons";

// Vendas do período (todas, com e sem CPF): totais, ticket médio e a quebra por forma de pagamento.
function SalesCard({ sales }: { sales: SalesSummary }) {
  return (
    <Card className="p-[18px]">
      <CardHeading icon={Receipt} tom="ciano" title="Resumo de vendas" subtitle="Faturamento, ticket médio e formas de pagamento" />
      {sales.count === 0 ? (
        <p className={hintClass}>Nenhuma venda nesse período.</p>
      ) : (
        <>
          <dl className="mb-5 grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
            <Stat label="Faturamento" value={formatMoney(sales.revenue)} detail={`${formatNumber(sales.count)} ${plural(sales.count, "venda", "vendas")}`} />
            <Stat label="Ticket médio" value={formatMoney(sales.averageTicket)} detail="por venda" />
            <Stat
              label="Vendas com CPF"
              value={`${formatPercent(sales.withCpfPercent)}%`}
              detail={`${formatNumber(sales.withCpf)} identificadas no programa`}
            />
          </dl>
          <h4 className="mb-2.5 text-xs font-semibold text-ink-2">Por forma de pagamento</h4>
          <BarrasDeVendas groups={sales.byPayment} colunas="grid-cols-2 max-[860px]:grid-cols-1" />
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border p-3.5 ${TONS.ciano.painel}`}>
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-[22px] leading-[1.2] font-semibold tracking-[-.02em]">{value}</dd>
      <dd className="text-xs text-ink-2">{detail}</dd>
    </div>
  );
}

export default SalesCard;
