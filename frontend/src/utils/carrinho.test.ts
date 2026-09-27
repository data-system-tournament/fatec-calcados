import { describe, expect, it } from "vitest";
import type { CartItem } from "../types";
import { chaveDoItem, mudarQuantidade, somarAoCarrinho, tirarDoCarrinho, unidadesPorProduto } from "./carrinho";

const carrinho: CartItem[] = [
  { sku: "TEN-001", size: 40, quantity: 1 },
  { sku: "MEI-002", size: null, quantity: 2 },
];

describe("carrinho", () => {
  it("a chave separa o mesmo produto em numerações diferentes", () => {
    expect(chaveDoItem({ sku: "TEN-001", size: 40 })).toBe("TEN-001#40");
    expect(chaveDoItem({ sku: "MEI-002", size: null })).toBe("MEI-002");
  });

  it("soma na mesma numeração e cria item novo para outra", () => {
    expect(somarAoCarrinho(carrinho, "TEN-001", 40)[0].quantity).toBe(2);
    const outro = somarAoCarrinho(carrinho, "TEN-001", 41, 2);
    expect(outro).toHaveLength(3);
    expect(outro[2]).toEqual({ sku: "TEN-001", size: 41, quantity: 2 });
  });

  it("muda a quantidade sem cair abaixo de 1 e remove pela chave", () => {
    expect(mudarQuantidade(carrinho, "MEI-002", -5)[1].quantity).toBe(1);
    expect(mudarQuantidade(carrinho, "TEN-001#40", 2)[0].quantity).toBe(3);
    expect(tirarDoCarrinho(carrinho, "TEN-001#40")).toEqual([carrinho[1]]);
  });

  it("conta as unidades por produto somando as numerações", () => {
    const dois = somarAoCarrinho(carrinho, "TEN-001", 42);
    expect(unidadesPorProduto(dois)).toEqual({ "TEN-001": 2, "MEI-002": 2 });
  });
});
