import { CalendarX2, Clock, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import type { DashboardData } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import CardHeading from "./CardHeading";
import { TONS, type Tom } from "./tons";

type Linha = { label: string; pts: number; detail?: string; icon: LucideIcon; tom: Tom };

// Passivo de pontos: quanto a loja "deve" em desconto se os clientes usarem o saldo, e quanto disso vence logo.
function PointsLiabilityCard({ points }: { points: DashboardData["points"] }) {
  const linhas: Linha[] = [
    { label: "Saldo em aberto", pts: points.openBalance, detail: `vale até ${formatMoney(points.openBalanceValue)}`, icon: Wallet, tom: "azul" },
    {
      label: `Vence em ${points.expiring.days} dias`,
      pts: points.expiring.points,
      detail: `vale até ${formatMoney(points.expiring.value)}`,
      icon: Clock,
      tom: "ambar",
    },
    { label: "Expirados no período", pts: points.expired, icon: CalendarX2, tom: "vermelho" },
  ];

  return (
    <Card className="flex flex-col p-[18px]">
      <CardHeading icon={Wallet} tom="ambar" title="Passivo de pontos" subtitle="O que a loja ainda deve em desconto" />
      <dl className="flex flex-col gap-2.5">
        {linhas.map((linha) => {
          const tom = TONS[linha.tom];
          return (
            <div key={linha.label} className={`flex items-center gap-3 rounded-lg border p-3 ${tom.painel}`}>
              <span className={`grid size-8 flex-none place-items-center rounded-lg bg-surface ${tom.icone}`}>
                <linha.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <dt className="min-w-0 flex-1 text-[13px] text-ink-2">{linha.label}</dt>
              <dd className="text-right">
                <b className="block text-base font-semibold tracking-[-.01em]">{formatNumber(linha.pts)} pts</b>
                {linha.detail && <small className="text-xs text-ink-2">{linha.detail}</small>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={hintClass}>Cada 100 pontos valem R$ 5,00 de desconto. O que vence some do saldo.</p>
    </Card>
  );
}

export default PointsLiabilityCard;
