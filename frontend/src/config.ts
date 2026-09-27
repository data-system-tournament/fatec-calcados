export const REGISTER_CODE = "araras-01";
export const REGISTER_NAME = "Caixa 01";
export const STORE_NAME = "Loja Araras";

export const PAYMENT_METHODS = [
  { code: "PIX", label: "Pix" },
  { code: "CREDITO", label: "Crédito" },
  { code: "DEBITO", label: "Débito" },
  { code: "DINHEIRO", label: "Dinheiro" },
];

export function paymentLabel(code: string): string {
  return PAYMENT_METHODS.find((method) => method.code === code)?.label ?? code;
}

// Contato do encarregado de dados (LGPD), mostrado na Política de Privacidade. Troque pelo e-mail real.
export const PRIVACY_EMAIL = "privacidade@fatecalcados.com.br";
