// CPF no formulário: máscara enquanto a pessoa digita e validação antes de enviar. Espelha o cpf.py do
// backend, que continua sendo quem decide.

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
