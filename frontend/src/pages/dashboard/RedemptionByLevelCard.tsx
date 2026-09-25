import { Gift } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { corDoNivel } from "../../components/ui/corDoNivel";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { hintClass } from "../../components/ui/styles";
import type { LevelRedemption } from "../../types";
import { formatNumber, formatPercent } from "../../utils/format";
import CardHeading from "./CardHeading";

// Qual nível mais usa os pontos: taxa = compras com resgate ÷ compras com CPF, pelo nível de antes da compra.
function RedemptionByLevelCard({ levels }: { levels: LevelRedemption[] }) {
  return (
    <Card className="p-[18px]">
      <CardHeading icon={Gift} tom="verde" title="Resgate por nível" subtitle="Qual nível mais usa os pontos" />
      <ul className="flex flex-col gap-4">
        {levels.map((level) => (
          <li key={level.code}>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <LevelBadge level={level.name} />
              <span className="text-[12.5px] text-muted">
                {level.purchasesWithRedemption} de {level.purchases} compras usaram pontos
              </span>
              <span className="text-right">
                <b className="block text-[15px] font-semibold">{formatPercent(level.redeemRate)}%</b>
                <small className="text-xs text-muted">{formatNumber(level.pointsRedeemed)} pts</small>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <div className={`h-full rounded-full ${corDoNivel(level.name)}`} style={{ width: `${level.redeemRate}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className={hintClass}>Nível do cliente antes de cada compra, só compras com CPF.</p>
    </Card>
  );
}

export default RedemptionByLevelCard;
