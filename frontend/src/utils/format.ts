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

export function onlyDigits(text: string | null | undefined): string {
  return (text || "").replace(/\D/g, "");
}

// Feito com IA: "12345678900" -> "123.456.789-00"; também funciona enquanto a pessoa digita.
export function formatCpf(text: string): string {
  return onlyDigits(text)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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

export function todayLabel(): string {
  const text = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text[0].toUpperCase() + text.slice(1);
}

// Feito com IA: espelho de cpf.validar do backend (11 dígitos, não repetidos, dois dígitos verificadores),
// para o formulário avisar o erro antes de enviar. O backend continua sendo quem decide.
export function isValidCpf(text: string): boolean {
  const digits = onlyDigits(text);
  if (digits.length !== 11 || digits === digits[0].repeat(11)) return false;
  const numbers = [...digits].map(Number);
  const checkDigit = (base: number[]) => {
    const sum = base.reduce((total, n, i) => total + n * (base.length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(numbers.slice(0, 9)) === numbers[9] && checkDigit(numbers.slice(0, 10)) === numbers[10];
}
