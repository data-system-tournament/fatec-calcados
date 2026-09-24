export const REGISTER_CODE = "araras-01";
export const REGISTER_NAME = "Caixa 01";
export const STORE_NAME = "Loja Araras";

export const POINTS_PER_BLOCK = 100;
export const BLOCK_VALUE = 5;

export const PAYMENT_METHODS = [
  { code: "PIX", label: "Pix" },
  { code: "CREDITO", label: "Crédito" },
  { code: "DEBITO", label: "Débito" },
  { code: "DINHEIRO", label: "Dinheiro" },
];

export function paymentLabel(code) {
  return PAYMENT_METHODS.find((method) => method.code === code).label;
}
