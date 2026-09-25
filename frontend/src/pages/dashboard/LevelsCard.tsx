import { Layers } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { corDoNivel } from "../../components/ui/corDoNivel";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { hintClass } from "../../components/ui/styles";
import type { LevelSummary } from "../../types";
import { formatPercent } from "../../utils/format";
import CardHeading from "./CardHeading";

type LevelsCardProps = {
  totalClients: number;
  levels: LevelSummary[];
};

function LevelsCard({ totalClients, levels }: LevelsCardProps) {
  return (
    <Card className="p-[18px]">
      <CardHeading icon={Layers} tom="violeta" title="Clientes por nível" subtitle="Como a base se divide entre Bronze, Prata e Ouro" />
      <ul className="flex flex-col gap-4">
        {levels.map((level) => (
          <li key={level.name}>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <LevelBadge level={level.name} />
              <span className="text-[12.5px] text-muted">
                {level.bonus > 0 ? `+${level.bonus}% em pontos` : "1 ponto por real"} · {formatPercent(level.percent)}%
              </span>
              <b className="text-[15px] font-semibold">{level.clients}</b>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <div className={`h-full rounded-full ${corDoNivel(level.name)}`} style={{ width: `${level.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className={hintClass}>{totalClients} clientes no total. O nível vem dos pontos acumulados nos últimos 12 meses.</p>
    </Card>
  );
}

export default LevelsCard;
