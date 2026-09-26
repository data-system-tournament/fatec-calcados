import { describe, expect, it } from "vitest";
import { formatDate, formatPercent, normalizeText, plural, roundMoney } from "./format";

describe("formatação", () => {
  it("a busca ignora acento e maiúscula", () => {
    expect(normalizeText("Tênis")).toBe(normalizeText("TENIS"));
  });

  it("arredonda dinheiro em centavos", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("escolhe singular e plural", () => {
    expect(plural(1, "venda", "vendas")).toBe("venda");
    expect(plural(0, "venda", "vendas")).toBe("vendas");
  });

  it("formata data ISO e percentual em pt-BR", () => {
    expect(formatDate("2026-09-24")).toBe("24/09/2026");
    expect(formatPercent(12.5)).toBe("12,5");
  });
});
