export type CsvCell = string | number;

// Feito com IA: CSV para abrir no Excel em português: separador ";", número com vírgula decimal e
// aspas em torno de células que tenham ";", aspas ou quebra de linha.
export function csvNumber(value: number): string {
  return String(value).replace(".", ",");
}

function csvCell(cell: CsvCell): string {
  const text = typeof cell === "number" ? csvNumber(cell) : cell;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

// O BOM no começo faz o Excel reconhecer os acentos (UTF-8).
export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
