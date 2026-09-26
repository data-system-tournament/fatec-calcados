import { describe, expect, it } from "vitest";
import { estimatePoints, maxRedeemPoints, NIVEIS, pointsToMoney, REVIEW_POINTS, VALIDITY_MONTHS } from "./regras";

// Espelham as regras de backend/src/regras.py: se um número mudar lá, estes testes avisam aqui.
describe("regras do cliente (prévia do PDV)", () => {
  it("100 pontos valem R$ 5,00", () => {
    expect(pointsToMoney(100)).toBe(5);
    expect(pointsToMoney(1800)).toBe(90);
  });

  it("bronze ganha 1 ponto por real, sem centavos", () => {
    expect(estimatePoints(489.6, 0)).toBe(489);
  });

  it("prata e ouro somam o bônus do nível e arredondam para baixo", () => {
    expect(estimatePoints(489.6, 10)).toBe(537);
    expect(estimatePoints(489.6, 20)).toBe(586);
  });

  it("compra abaixo de R$ 1,00 não gera pontos", () => {
    expect(estimatePoints(0.99, 20)).toBe(0);
  });

  it("o resgate máximo é limitado pelo saldo, em blocos de 100 pontos", () => {
    expect(maxRedeemPoints(1800, 349.9)).toBe(1800);
    expect(maxRedeemPoints(250, 349.9)).toBe(200);
  });

  it("níveis, validade e avaliação iguais aos de regras.py", () => {
    expect(NIVEIS.map((n) => [n.nome, n.minimo, n.bonus])).toEqual([["Bronze", 0, 0], ["Prata", 1000, 10], ["Ouro", 5000, 20]]);
    expect(VALIDITY_MONTHS).toBe(12);
    expect(REVIEW_POINTS).toBe(20);
  });

  it("o resgate máximo não deixa o desconto passar do valor da compra", () => {
    expect(maxRedeemPoints(1800, 47)).toBe(900); // 9 blocos de R$ 5 cabem em R$ 47
    expect(maxRedeemPoints(1800, 4.99)).toBe(0);
  });
});
