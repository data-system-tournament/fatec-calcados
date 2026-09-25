import { CircleDollarSign, Coins, Gift, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData } from "../../types";
import { formatDate, formatMoney, formatNumber, formatPercent } from "../../utils/format";
import { TONS, type Tom } from "./tons";

type Kpi = { label: string; value: string; detail: ReactNode; icon: LucideIcon; tom: Tom };

// Os quatro números do programa, cada um na cor do seu assunto (ver tons.ts). 4 colunas no desktop,
// 2 abaixo de 1100px e 1 no celular.
function KpiCards({ data }: { data: DashboardData }) {
  const { points, totalClients } = data;

  const kpis: Kpi[] = [
    {
      label: "Base do programa",
      value: formatNumber(totalClients),
      detail: <>clientes cadastrados até {formatDate(data.end)}</>,
      icon: Users,
      tom: "violeta",
    },
    {
      label: "Pontos acumulados",
      value: formatNumber(points.earned),
      detail: <>em {formatNumber(points.purchases)} compras com CPF · {formatNumber(points.expired)} expiraram</>,
      icon: Coins,
      tom: "azul",
    },
    {
      label: "Pontos resgatados",
      value: formatNumber(points.redeemed),
      detail: <>{formatPercent(points.redeemRate)}% do que foi acumulado</>,
      icon: Gift,
      tom: "verde",
    },
    {
      label: "Custo do programa",
      value: formatMoney(points.cost),
      detail: (
        <>
          {formatPercent(points.costPercent)}% do faturamento · saldo em aberto vale até {formatMoney(points.openBalanceValue)}
        </>
      ),
      icon: CircleDollarSign,
      tom: "ambar",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
      {kpis.map((kpi, index) => {
        const tom = TONS[kpi.tom];
        return (
          <div
            key={kpi.label}
            className={`animate-subir flex flex-col gap-1 rounded-[10px] border p-4 ${tom.painel}`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-ink-2">{kpi.label}</span>
              <span className={`grid size-8 flex-none place-items-center rounded-lg bg-surface ${tom.icone}`}>
                <kpi.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </div>
            <strong className="mt-1 text-[28px] leading-[1.15] font-semibold tracking-[-.025em] max-[860px]:text-[24px]">
              {kpi.value}
            </strong>
            <small className="text-xs leading-snug text-ink-2">{kpi.detail}</small>
          </div>
        );
      })}
    </div>
  );
}

export default KpiCards;
