export function formatMoney(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString("pt-BR");
}

export function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

// Feito com IA: tira os acentos para a busca ("Tênis" e "tenis" viram "tenis").
export function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function onlyDigits(text) {
  return (text || "").replace(/\D/g, "");
}

// Feito com IA: "12345678900" -> "123.456.789-00"; também funciona enquanto a pessoa digita.
export function formatCpf(text) {
  return onlyDigits(text)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function plural(count, singular, pluralWord) {
  return count === 1 ? singular : pluralWord;
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function currentTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function todayLabel() {
  const text = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text[0].toUpperCase() + text.slice(1);
}
