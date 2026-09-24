import { useState } from "react";

function PeriodFilter({ data, onChange }) {
  const [start, setStart] = useState(data.start);
  const [end, setEnd] = useState(data.end);

  return (
    <div className="period">
      <label>De <input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label>Até <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <button className="btn dark sm" disabled={!start || !end} onClick={() => onChange({ start, end })}>
        Aplicar
      </button>
      {data.shortcuts.map((shortcut) => {
        const active = shortcut.start === data.start && shortcut.end === data.end;
        return (
          <button
            key={shortcut.label}
            className={active ? "btn sm dark" : "btn sm"}
            onClick={() => onChange({ start: shortcut.start, end: shortcut.end })}
          >
            {shortcut.label}
          </button>
        );
      })}
    </div>
  );
}

export default PeriodFilter;
