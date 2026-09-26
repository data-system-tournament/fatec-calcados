import { useRef, type KeyboardEvent } from "react";

export type Aba<T extends string> = { valor: T; rotulo: string };

const base = "border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ";
const ativa = "border-ink text-ink";
const inativa = "border-transparent text-muted hover:text-ink";

// Feito com IA: abas no padrão WAI-ARIA. Só a aba ativa entra no Tab; as setas (e Home/End) trocam de
// aba e levam o foco junto. Cada aba tem id `${idBase}-${valor}`; o painel que elas controlam deve ter
// id `${idBase}-painel` e aria-labelledby apontando para a aba ativa.
export function Abas<T extends string>({ abas, valor, onChange, rotulo, idBase }: {
  abas: readonly Aba<T>[];
  valor: T;
  onChange: (valor: T) => void;
  rotulo: string;
  idBase: string;
}) {
  const lista = useRef<HTMLDivElement>(null);

  function teclado(e: KeyboardEvent<HTMLDivElement>) {
    const atual = abas.findIndex((a) => a.valor === valor);
    const destino = {
      ArrowRight: (atual + 1) % abas.length,
      ArrowLeft: (atual - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    onChange(abas[destino].valor);
    lista.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[destino]?.focus();
  }

  return (
    <div ref={lista} className="flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label={rotulo} onKeyDown={teclado}>
      {abas.map((a) => {
        const selecionada = a.valor === valor;
        return (
          <button
            key={a.valor}
            id={`${idBase}-${a.valor}`}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={`${idBase}-painel`}
            tabIndex={selecionada ? 0 : -1}
            className={base + (selecionada ? ativa : inativa)}
            onClick={() => onChange(a.valor)}
          >
            {a.rotulo}
          </button>
        );
      })}
    </div>
  );
}
