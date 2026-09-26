import { Coins, ShoppingCart } from "lucide-react";
import { createElement } from "react";
import { estimatePoints } from "../../regras";
import type { Product } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import { TONS } from "../dashboard/tons";
import { categoriaDoProduto, iconeDoProduto } from "../pdv/categorias";

// Feito com IA: card de produto da loja online, no formato das vitrines de e-commerce: a "foto" em cima
// (por enquanto um quadrado claro com o ícone da categoria) e, embaixo, categoria, nome, preço e o botão
// de carrinho. No lugar das estrelas dessas lojas vai o que o programa tem de real: quantos pontos a
// compra rende, com o bônus do nível (mesma conta de regras.py, via estimatePoints). Não há avaliação
// nem preço antigo no backend, então nada disso é inventado aqui.
function CardProduto({ product, quantidade, bonus, onAdd }: {
  product: Product;
  quantidade: number;
  bonus: number;
  onAdd: (product: Product) => void;
}) {
  const pontos = estimatePoints(product.price, bonus);

  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-[10px] border bg-surface transition-[border-color,box-shadow] duration-150 hover:shadow-pop ${quantidade ? "border-ink" : "border-line hover:border-line-2"}`}>
      <div className="relative grid aspect-square place-items-center border-b border-line bg-foto">
        {/* createElement: o ícone é um componente fixo do lucide escolhido pela categoria, não criado aqui. */}
        {createElement(iconeDoProduto(product.name), { size: 48, strokeWidth: 1.2, className: "text-faint", "aria-hidden": true })}
        {quantidade > 0 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2 text-[11.5px] leading-5 font-semibold text-surface tabular-nums">
            {quantidade} no carrinho
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <small className="text-[11.5px] text-muted">{categoriaDoProduto(product.name)}</small>
        <h3 className="text-[13.5px] leading-snug font-medium">{product.name}</h3>
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium tabular-nums ${TONS.azul.icone}`}>
          <Coins size={13} aria-hidden /> +{formatNumber(pontos)} pts
        </span>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <b className="text-[15px] font-semibold tabular-nums">{formatMoney(product.price)}</b>
          <button
            type="button"
            onClick={() => onAdd(product)}
            aria-label={quantidade ? `Adicionar mais um ${product.name} (${quantidade} no carrinho)` : `Adicionar ${product.name} ao carrinho`}
            className="grid size-9 flex-none place-items-center rounded-md border border-line-2 text-ink-2 transition-colors duration-100 hover:border-ink hover:bg-ink hover:text-surface"
          >
            <ShoppingCart size={16} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

export default CardProduto;
