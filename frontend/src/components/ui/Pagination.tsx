import { Button } from "./Button";

type PaginationProps = {
  page: number;
  pages: number;
  total: number;
  noun: [singular: string, plural: string];
  onChange: (page: number) => void;
};

// Rodapé de listas paginadas: "40 clientes · página 1 de 2" e os botões Anterior/Próxima.
export function Pagination({ page, pages, total, noun, onChange }: PaginationProps) {
  return (
    <div className="mt-3.5 flex items-center justify-between gap-3 text-[13px] text-muted">
      <span>{total} {total === 1 ? noun[0] : noun[1]} · página {page} de {pages}</span>
      <div className="flex gap-1.5">
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</Button>
      </div>
    </div>
  );
}
