import { Star } from "lucide-react";
import { useState } from "react";
import { plural } from "../../utils/format";

const cheia = "fill-current text-accent";
const vazia = "text-line-2";

// Nota já dada, só para ler: as estrelas são decorativas e o texto vai para o leitor de tela.
export function Estrelas({ nota, tamanho = 15 }: { nota: number; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={tamanho} className={n <= nota ? cheia : vazia} aria-hidden />
      ))}
    </span>
  );
}

// Feito com IA: escolha da nota com rádios nativos (escondidos), então as setas do teclado trocam a
// nota como em qualquer grupo de rádio e o leitor de tela anuncia "3 estrelas". O foco aparece no rótulo
// da estrela (has-focus-visible), porque o rádio em si fica invisível. Passar o mouse mostra a prévia.
export function EscolherNota({ nota, onChange, nome }: { nota: number; onChange: (nota: number) => void; nome: string }) {
  const [previa, setPrevia] = useState(0);
  const acesas = previa || nota;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[12.5px] font-medium text-ink-2">Sua nota</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setPrevia(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-md p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink"
            onMouseEnter={() => setPrevia(n)}
          >
            <input
              type="radio"
              name={nome}
              value={n}
              checked={nota === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="sr-only">{n} {plural(n, "estrela", "estrelas")}</span>
            <Star size={28} className={n <= acesas ? cheia : vazia} aria-hidden />
          </label>
        ))}
        <span className="ml-2 text-[13px] text-muted" aria-hidden>
          {nota ? `${nota} de 5` : "Escolha de 1 a 5"}
        </span>
      </div>
    </fieldset>
  );
}
