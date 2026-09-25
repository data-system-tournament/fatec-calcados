import type { ReactNode } from "react";

// Bloco da coluna de fechamento da venda (cliente, pontos, pagamento): título pequeno e conteúdo.
function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-3 flex min-h-5 items-center justify-between">
        <h2 className="text-[13px] font-medium text-muted">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export default Secao;
