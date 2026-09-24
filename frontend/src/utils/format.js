// Funções de formatação usadas nas telas (padrão brasileiro).

export function formatMoney(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Sem centavos: R$ 1.234
export function formatMoneyShort(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString("pt-BR");
}

export function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export function onlyDigits(text) {
  return (text || "").replace(/\D/g, "");
}

// "12345678900" -> "123.456.789-00". Também funciona enquanto a pessoa digita.
export function formatCpf(text) {
  return onlyDigits(text)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// ["Ana", "Bia", "Caio"] -> "Ana, Bia e Caio"
export function formatNameList(names) {
  return new Intl.ListFormat("pt-BR").format(names);
}

export function plural(count, singular, pluralWord) {
  return count === 1 ? singular : pluralWord;
}

export function currentTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// "Quinta-feira, 24 de setembro"
export function todayLabel() {
  const text = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text[0].toUpperCase() + text.slice(1);
}
