import { Card, CardTitle } from "../../components/ui/Card";
import { Led } from "../../components/ui/Led";
import type { Register } from "../../types";
import { formatNumber } from "../../utils/format";

type PulseCardProps = {
  newClientsToday: number;
  pointsRedeemedToday: number;
  registers: Register[];
};

function registerStatus(register: Register) {
  if (register.online) return "online";
  if (register.pending > 0) return `offline · ${register.pending} para sincronizar`;
  return "offline";
}

function PulseRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2 text-[13px] text-muted">
      <dt>{label}</dt>
      <dd className="text-lg font-semibold tracking-[-.01em] text-ink">{value}</dd>
    </div>
  );
}

// Lateral da aba Ações: números do dia neste caixa e o estado de cada caixa.
function PulseCard({ newClientsToday, pointsRedeemedToday, registers }: PulseCardProps) {
  return (
    <Card className="p-[18px]">
      <CardTitle>Pulso de hoje</CardTitle>
      <dl className="mb-5">
        <PulseRow label="Novos cadastros" value={newClientsToday} />
        <PulseRow label="Pontos resgatados" value={formatNumber(pointsRedeemedToday)} />
      </dl>

      <CardTitle>Caixas</CardTitle>
      <ul>
        {registers.map((register) => (
          <li key={register.name} className="flex items-center gap-2.5 py-[7px] text-[13px]">
            <Led on={register.online} />
            <span>{register.name}</span>
            <small className="ml-auto text-xs text-muted">{registerStatus(register)}</small>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default PulseCard;
