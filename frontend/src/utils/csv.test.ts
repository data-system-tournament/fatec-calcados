import { describe, expect, it } from "vitest";
import { csvNumber, toCsv } from "./csv";

describe("CSV para Excel em português", () => {
  it("usa ponto e vírgula e vírgula decimal", () => {
    expect(toCsv([["Base", 40], ["Taxa", 20.3]])).toBe("Base;40\r\nTaxa;20,3");
    expect(csvNumber(0.88)).toBe("0,88");
  });

  it("coloca aspas em células com ponto e vírgula, aspas ou quebra de linha", () => {
    expect(toCsv([["a;b", 'diz "oi"', "linha\ndois"]])).toBe('"a;b";"diz ""oi""";"linha\ndois"');
  });

  it("linha vazia separa as seções", () => {
    expect(toCsv([["A"], [], ["B"]])).toBe("A\r\n\r\nB");
  });
});
