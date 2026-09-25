import { useId, type ReactNode } from "react";

// Um assunto do dashboard (Pontos, Vendas, Clientes): título, uma frase de contexto e os cards.
// `atraso` escalona a entrada (ver --animate-subir em index.css).
function Secao({ title, description, atraso = 0, children }: {
  title: string;
  description: string;
  atraso?: number;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <section aria-labelledby={id} className="animate-subir flex flex-col gap-3" style={{ animationDelay: `${atraso}ms` }}>
      <div>
        <h2 id={id} className="text-base font-semibold tracking-[-.01em]">{title}</h2>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default Secao;
