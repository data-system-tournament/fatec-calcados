import { useState } from "react";
import { Button } from "../../components/ui/Button";
import type { DashboardData, Period } from "../../types";

const dateInputClass = "rounded-md border border-line-2 bg-surface px-2 py-[5px] text-[12.5px] text-ink";

// Escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas classes em conflito vence.
const atalhoBase = "rounded-md border px-3 py-1 text-[12.5px] transition-colors duration-150";
const atalhoAtivo = `${atalhoBase} border-line bg-surface font-medium text-ink shadow-card`;
const atalhoInativo = `${atalhoBase} border-transparent text-muted hover:text-ink`;

type PeriodFilterProps = {
  data: DashboardData;
  onChange: (period: Period) => void;
};

// Atalhos (30 dias, 90 dias, 12 meses) num controle segmentado, mais o intervalo livre entre duas datas.
function PeriodFilter({ data, onChange }: PeriodFilterProps) {
  const [start, setStart] = useState(data.start);
  const [end, setEnd] = useState(data.end);
  const semMudanca = start === data.start && end === data.end;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
      <div role="group" aria-label="Atalhos de período" className="inline-flex gap-0.5 rounded-lg bg-subtle p-0.5">
        {data.shortcuts.map((shortcut) => {
          const active = shortcut.start === data.start && shortcut.end === data.end;
          return (
            <button
              key={shortcut.label}
              type="button"
              aria-pressed={active}
              className={active ? atalhoAtivo : atalhoInativo}
              onClick={() => onChange({ start: shortcut.start, end: shortcut.end })}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          De <input type="date" className={dateInputClass} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Até <input type="date" className={dateInputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <Button variant="dark" size="sm" disabled={!start || !end || semMudanca} onClick={() => onChange({ start, end })}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

export default PeriodFilter;
