import type { LucideIcon } from "lucide-react";
import { TONS, type Tom } from "./tons";

// Cabeçalho dos cards do dashboard: ícone na cor do assunto, título e uma linha de contexto.
function CardHeading({ icon: Icon, tom, title, subtitle }: {
  icon: LucideIcon;
  tom: Tom;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className={`grid size-8 flex-none place-items-center rounded-lg ${TONS[tom].chip}`}>
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm leading-tight font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export default CardHeading;
