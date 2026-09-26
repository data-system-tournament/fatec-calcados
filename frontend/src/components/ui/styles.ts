// Classes de formulário usadas em mais de uma tela.
export const fieldLabelClass = "mb-3 flex flex-col gap-1.5 text-[12.5px] font-medium text-ink-2";

export const inputClass =
  "rounded-md border border-line-2 bg-surface px-[11px] py-[9px] text-sm font-normal text-ink " +
  "focus:border-ink focus:shadow-[0_0_0_3px_var(--subtle)] focus:outline-none";

export const errorClass = "m-0 text-[12.5px] text-danger";

export const hintClass = "mt-2 text-[13px] text-muted";

// Tabelas de dados (Ranking, Clientes, Vendas).
export const thClass = "border-b border-line px-2.5 pb-2 text-xs font-medium whitespace-nowrap text-muted";
export const tdClass = "border-b border-line px-2.5 py-[9px] whitespace-nowrap";
// Coluna que some no celular (< 640px) para as principais caberem sem rolar de lado; o detalhe da linha
// continua mostrando tudo. Vai junto no <th> e no <td> da mesma coluna.
export const colunaSecundaria = "max-[640px]:hidden";
// Célula que pode quebrar linha no celular (ex.: "26/09/2026 15:06" vira data em cima e hora embaixo).
export const quebraNoCelular = "max-[640px]:whitespace-normal";
