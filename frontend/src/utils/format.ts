// Formatação usada em várias telas. Só entra aqui função pura usada em 2+ lugares; o que uma tela só
// usa fica junto dela.

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

// Percentual vindo do backend já em pontos percentuais (12.5 -> "12,5"); o "%" fica no texto.
export function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Feito com IA: tira os acentos para a busca ("Tênis" e "tenis" viram "tenis").
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function plural(count: number, singular: string, pluralWord: string): string {
  return count === 1 ? singular : pluralWord;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Data e hora do backend ("2026-09-24T14:30:00-03:00") no formato do caixa: "24/09/2026 14:30".
export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");
}

// Só o dia de uma data e hora do backend: "24/09/2026".
export function formatDay(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString("pt-BR");
}

export function currentTime(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
