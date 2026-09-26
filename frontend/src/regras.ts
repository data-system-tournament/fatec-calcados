// Feito com IA: espelho de backend/src/regras.py, para as telas mostrarem prévias e explicarem as regras
// (Meus pontos, painel de ajuda) sem esperar a API.
// O backend continua sendo a fonte da verdade: o valor oficial vem na resposta da venda.
// Se um número mudar em regras.py (bloco de resgate, níveis, validade, avaliação), mude aqui também.

export const POINTS_PER_BLOCK = 100;
export const BLOCK_VALUE = 5;
export const VALIDITY_MONTHS = 12;
export const REVIEW_POINTS = 20;

// regras.NIVEIS: pontos acumulados em 12 meses para chegar ao nível e o bônus sobre os pontos da compra.
export const NIVEIS = [
  { nome: "Bronze", minimo: 0, bonus: 0 },
  { nome: "Prata", minimo: 1000, bonus: 10 },
  { nome: "Ouro", minimo: 5000, bonus: 20 },
];

export function pointsToMoney(points: number): number {
  return (points / POINTS_PER_BLOCK) * BLOCK_VALUE;
}

// Máximo de pontos que dá para usar numa compra: limitado pelo saldo resgatável e pelo subtotal
// (o desconto não pode passar do valor da compra), sempre em blocos fechados de 100 pontos.
export function maxRedeemPoints(redeemablePoints: number, subtotal: number): number {
  const blocksAllowedByValue = Math.floor(subtotal / BLOCK_VALUE);
  const blocksInBalance = Math.floor(redeemablePoints / POINTS_PER_BLOCK);
  return Math.min(blocksAllowedByValue, blocksInBalance) * POINTS_PER_BLOCK;
}

// Mesma conta de regras.calcular_pontos: centavos descartados + bônus do nível.
export function estimatePoints(total: number, bonusPercent: number): number {
  return Math.floor((Math.floor(total) * (100 + bonusPercent)) / 100);
}
