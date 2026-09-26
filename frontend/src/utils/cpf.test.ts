import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf, onlyDigits } from "./cpf";

describe("máscara de CPF", () => {
  it("formata o CPF enquanto a pessoa digita", () => {
    expect(formatCpf("12345678900")).toBe("123.456.789-00");
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCpf("123456789001234")).toBe("123.456.789-00");
  });

  it("onlyDigits ignora o que não é número", () => {
    expect(onlyDigits("123.456.789-00")).toBe("12345678900");
    expect(onlyDigits(null)).toBe("");
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
