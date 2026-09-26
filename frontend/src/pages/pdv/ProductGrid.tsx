import { useState } from "react";
import { Plus } from "lucide-react";
import type { Product } from "../../types";
import CardProduto from "../conta/CardProduto";
import { formatMoney } from "../../utils/format";
import { CATEGORIAS, categoriaDoProduto, iconeDoProduto, type Categoria } from "./categorias";

const chipBase = "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors duration-100 ";
const chipAtivo = "border-ink bg-ink text-surface";
const chipInativo = "border-line-2 bg-surface text-ink-2 hover:border-faint";

// O PDV usa uma grade compacta (o caixa clica rápido); a loja online, cards maiores de vitrine. No celular
// as duas ficam em 2 colunas, como nas lojas online: com uma só, cada card ocupava a tela inteira.
const grades = {
  pdv: "grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-2 max-[520px]:grid-cols-2",
  loja: "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-[520px]:grid-cols-2 max-[520px]:gap-3",
};

type ProductGridProps = {
  products: Product[];
  // Quantidade de cada produto já no carrinho (por sku), para marcar o card.
  quantidades: Record<string, number>;
  onAdd: (product: Product) => void;
  // "loja": cards de vitrine (CardProduto) para a loja online; "pdv" (padrão): o card compacto do caixa.
  variante?: keyof typeof grades;
  // Bônus do nível do cliente, para o "+N pts" dos cards da loja.
  bonus?: number;
};

// Catálogo em grade: cada clique soma uma unidade do produto ao carrinho.
function ProductGrid({ products, quantidades, onAdd, variante = "pdv", bonus = 0 }: ProductGridProps) {
  const [filtro, setFiltro] = useState<Categoria | null>(null);
  const visiveis = filtro ? products.filter((p) => categoriaDoProduto(p.name) === filtro) : products;

  if (products.length === 0) {
    return <p className="py-12 text-center text-muted" role="status">Carregando produtos...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por categoria">
        <button className={chipBase + (filtro === null ? chipAtivo : chipInativo)} aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
          Todos
        </button>
        {CATEGORIAS.map((c) => (
          <button key={c} className={chipBase + (filtro === c ? chipAtivo : chipInativo)} aria-pressed={filtro === c} onClick={() => setFiltro(c)}>
            {c}
          </button>
        ))}
      </div>

      <ul className={grades[variante]}>
        {visiveis.map((product) => {
          const Icone = iconeDoProduto(product.name);
          const qtd = quantidades[product.sku] ?? 0;
          if (variante === "loja") {
            return (
              <li key={product.sku}>
                <CardProduto product={product} quantidade={qtd} bonus={bonus} onAdd={onAdd} />
              </li>
            );
          }
          return (
            <li key={product.sku}>
              <button
                onClick={() => onAdd(product)}
                aria-label={qtd ? `Adicionar mais um ${product.name} (${qtd} no carrinho)` : `Adicionar ${product.name}`}
                className={`group flex h-full w-full flex-col gap-3 rounded-[10px] border bg-surface p-3 text-left transition-[border-color,box-shadow] duration-100 hover:shadow-pop ${qtd ? "border-ink" : "border-line hover:border-line-2"}`}
              >
                <span className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-subtle text-muted">
                    <Icone size={18} strokeWidth={1.6} aria-hidden />
                  </span>
                  {qtd > 0 ? (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-[12px] font-semibold text-surface tabular-nums">
                      {qtd}
                    </span>
                  ) : (
                    <span className="grid size-6 place-items-center rounded-full text-faint transition-colors group-hover:bg-ink group-hover:text-surface">
                      <Plus size={14} aria-hidden />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[13.5px] leading-snug font-medium">{product.name}</span>
                  <span className="mt-auto flex items-baseline justify-between pt-1.5">
                    <b className="text-[14px] font-semibold tabular-nums">{formatMoney(product.price)}</b>
                    <small className="text-[11px] text-muted tabular-nums">{product.sku}</small>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ProductGrid;
