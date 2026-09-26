import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { hintClass, tdClass, thClass } from "../../components/ui/styles";
import type { RankingRow } from "../../types";
import { formatDate, formatNumber } from "../../utils/format";
import CardHeading from "./CardHeading";

type RankingProps = {
  ranking: RankingRow[];
  end: string;
};

// Os três primeiros ganham destaque (ouro, prata e bronze); do quarto em diante, número simples.
const PODIO: Record<number, string> = {
  1: "bg-accent-soft text-accent-ink",
  2: "bg-subtle text-ink-2",
  3: "bg-bronze/15 text-ink-2",
};

function Ranking({ ranking, end }: RankingProps) {
  return (
    <Card className="p-[18px]">
      <CardHeading icon={Trophy} tom="ambar" title="Ranking de clientes" subtitle="Quem mais acumulou pontos no período" />
      {ranking.length === 0 ? (
        <p className={hintClass}>Nenhuma compra com CPF nesse período.</p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={`${thClass} text-left`}>#</th>
                <th className={`${thClass} text-left`}>Cliente</th>
                <th className={`${thClass} text-left`}>CPF</th>
                <th className={`${thClass} text-left`}>Nível</th>
                <th className={`${thClass} text-right`}>Acumulado</th>
                <th className={`${thClass} text-right`}>Saldo em {formatDate(end)}</th>
              </tr>
            </thead>
            <tbody className="[&>tr:last-child>td]:border-b-0">
              {ranking.map((row) => (
                <tr key={row.position} className="hover:bg-subtle">
                  <td className={tdClass}>
                    <span className={`grid size-6 place-items-center rounded-md text-xs font-semibold ${PODIO[row.position] ?? "text-muted"}`}>
                      {row.position}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <Link to={`/admin/clientes/${row.id}`} className="font-medium underline-offset-[3px] hover:underline">{row.name}</Link>
                  </td>
                  <td className={tdClass}>{row.cpf}</td>
                  <td className={tdClass}><LevelBadge level={row.level} /></td>
                  <td className={`${tdClass} text-right`}>{formatNumber(row.earned)}</td>
                  <td className={`${tdClass} text-right`}>{formatNumber(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default Ranking;
