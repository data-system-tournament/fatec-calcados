import { Footprints, Package, type LucideIcon } from "lucide-react";
import { normalizeText } from "../../utils/format";

// Categoria só de vitrine, tirada do começo do nome do produto (o backend não tem categoria).
// Serve para o filtro do catálogo e o ícone de cada item; não entra em regra nenhuma.
export const CATEGORIAS = ["Tênis", "Botas", "Sapatos", "Sandálias", "Acessórios"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

const PREFIXOS: [string, Categoria][] = [
  ["tenis", "Tênis"],
  ["bota", "Botas"],
  ["sandalia", "Sandálias"],
  ["chinelo", "Sandálias"],
  ["meia", "Acessórios"],
  ["palmilha", "Acessórios"],
  ["cadarco", "Acessórios"],
];

export function categoriaDoProduto(nome: string): Categoria {
  const texto = normalizeText(nome);
  return PREFIXOS.find(([prefixo]) => texto.startsWith(prefixo))?.[1] ?? "Sapatos";
}

export function iconeDoProduto(nome: string): LucideIcon {
  return categoriaDoProduto(nome) === "Acessórios" ? Package : Footprints;
}
