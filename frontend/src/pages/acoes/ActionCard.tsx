import { Check, Hourglass, ListChecks, TrendingUp, UserPlus, UserX, type LucideIcon } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Pill } from "../../components/ui/Pill";
import type { Action } from "../../types";

// Ícone de cada lista, pelo `tipo` que o backend manda. Tipo novo sem ícone usa o genérico.
const ACTION_ICONS: Record<string, LucideIcon> = {
  sumindo: UserX,
  vencendo: Hourglass,
  subir: TrendingUp,
  segunda_compra: UserPlus,
};

type ActionCardProps = {
  action: Action;
  done: boolean;
  onOpen: () => void;
};

function ActionCard({ action, done, onOpen }: ActionCardProps) {
  const count = action.clients.length;
  const preview = action.clients.slice(0, 3).map((c) => c.name).join(", ");
  const ActionIcon = ACTION_ICONS[action.type] ?? ListChecks;
  const highlight = !done && count > 0;

  return (
    <Card
      className={`flex items-center justify-between gap-4 px-[18px] py-4 max-[860px]:flex-col max-[860px]:items-stretch ${highlight ? "border-l-[3px] border-l-accent" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className={`flex flex-none ${done ? "text-faint" : "text-ink"}`}><ActionIcon size={28} /></span>
        <div>
          <h3 className={`text-sm font-medium ${done ? "text-muted" : ""}`}>
            {action.title} <Pill className="ml-1 align-[1px]">{count}</Pill>
          </h3>
          <p className="mt-[3px] text-[13px] text-muted">{action.description}</p>
          {highlight && (
            <p className="mt-[3px] text-[13px] text-muted">{preview}{count > 3 && ` e mais ${count - 3}`}</p>
          )}
        </div>
      </div>

      {done && (
        <span className="inline-flex flex-none items-center gap-1.5 text-[12.5px] font-medium text-ok" aria-label="Concluído">
          <Check size={14} /> Feito
        </span>
      )}
      {highlight && <Button variant="dark" onClick={onOpen}>Ver clientes</Button>}
      {!done && count === 0 && <span className="text-[13px] text-muted">Ninguém nesta lista hoje</span>}
    </Card>
  );
}

export default ActionCard;
