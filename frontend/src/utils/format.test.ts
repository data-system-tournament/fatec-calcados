import { describe, expect, it } from "vitest";
import { formatCpf, formatDate, formatPercent, isValidCpf, normalizeText, onlyDigits, plural, roundMoney } from "./format";

describe("formatação", () => {
  it("formata o CPF enquanto a pessoa digita", () => {
    expect(formatCpf("12345678900")).toBe("123.456.789-00");
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCpf("123456789001234")).toBe("123.456.789-00");
  });

  it("onlyDigits ignora o que não é número", () => {
    expect(onlyDigits("123.456.789-00")).toBe("12345678900");
    expect(onlyDigits(null)).toBe("");
  });

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

describe("validação de CPF", () => {
  it("aceita CPF com os dois dígitos verificadores certos, com ou sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("recusa dígito verificador errado, tamanho errado e dígitos repetidos", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("5299822472")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});
