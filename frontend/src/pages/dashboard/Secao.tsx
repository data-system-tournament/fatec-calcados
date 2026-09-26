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
    // Feito com IA: na impressão a seção vira bloco (o espaço entre os filhos passa de gap para margem),
    // porque o Chrome ignora break-after: avoid entre itens de um flex e deixava o título sozinho no pé
    // da folha, com a frase de contexto já na página seguinte.
    <section
      aria-labelledby={id}
      className="animate-subir flex flex-col gap-3 print:block print:[&>*+*]:mt-3"
      style={{ animationDelay: `${atraso}ms` }}
    >
      {/* Na impressão, o título não fica sozinho no pé da folha, longe dos cards. */}
      <div className="print:break-inside-avoid print:break-after-avoid">
        <h2 id={id} className="text-base font-semibold tracking-[-.01em]">{title}</h2>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default Secao;
