import { ChevronRight, Coins, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Estrelas } from "../../components/ui/Estrelas";
import { estimatePoints } from "../../regras";
import type { Product } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import { TONS } from "../dashboard/tons";
import { categoriaDoProduto } from "../pdv/categorias";
import { FotoDoProduto } from "./pecas";

// Feito com IA: card de produto da loja online, no formato das vitrines de e-commerce: a foto em cima (sem
// foto, o ícone da categoria) e, embaixo, categoria, nome, nota das avaliações reais, pontos que a compra
// rende (com o bônus do nível, via estimatePoints) e preço. Foto e nome levam à página do produto. O botão
// do acessório põe no carrinho; o do calçado abre a página, porque ali se escolhe a numeração. Com o número
// do perfil preenchido, o card já diz se aquele número tem em estoque.
function CardProduto({ product, quantidade, bonus, numeroDoCliente, onAdd }: {
  product: Product;
  quantidade: number;
  bonus: number;
  numeroDoCliente: number | null;
  onAdd: (product: Product) => void;
}) {
  const pontos = estimatePoints(product.price, bonus);
  const pagina = `/loja/produto/${product.sku}`;
  const esgotado = product.stock === 0;
  const doCliente = product.usesSizes && numeroDoCliente !== null
    ? product.sizes.find((s) => s.size === numeroDoCliente)
    : undefined;

  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-[10px] border bg-surface transition-[border-color,box-shadow] duration-150 hover:shadow-pop ${quantidade ? "border-ink" : "border-line hover:border-line-2"}`}>
      <Link to={pagina} className="relative grid aspect-square place-items-center overflow-hidden border-b border-line bg-foto" tabIndex={-1} aria-hidden>
        <FotoDoProduto nome={product.name} foto={product.photo} tamanhoIcone={48} />
        {quantidade > 0 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2 text-[11.5px] leading-5 font-semibold text-surface tabular-nums">
            {quantidade} no carrinho
          </span>
        )}
        {esgotado ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-danger px-2 text-[11.5px] leading-5 font-semibold text-white">Esgotado</span>
        ) : (
          !product.usesSizes && product.stockStatus === "ACABANDO" && (
            <span className="absolute top-2.5 right-2.5 rounded-full bg-accent px-2 text-[11.5px] leading-5 font-semibold text-ink">
              Últimas unidades
            </span>
          )
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <small className="text-[11.5px] text-muted">{categoriaDoProduto(product.name)}</small>
        <h3 className="text-[13.5px] leading-snug font-medium">
          <Link to={pagina} className="hover:underline">{product.name}</Link>
        </h3>
        {product.rating !== null && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Estrelas nota={Math.round(product.rating)} tamanho={12} />
            <span className="tabular-nums">{product.rating.toFixed(1).replace(".", ",")} ({product.reviewCount})</span>
          </span>
        )}
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium tabular-nums ${TONS.azul.icone}`}>
          <Coins size={13} aria-hidden /> +{formatNumber(pontos)} pts
        </span>
        {numeroDoCliente !== null && product.usesSizes && !esgotado && (
          <small className={`text-[11.5px] font-medium ${doCliente && doCliente.quantity > 0 ? "text-ok" : "text-muted"}`}>
            {!doCliente
              ? `Não vem no nº ${numeroDoCliente}`
              : doCliente.quantity > 0
                ? `Tem o seu nº ${numeroDoCliente}`
                : `Sem o seu nº ${numeroDoCliente} agora`}
          </small>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <b className="text-[15px] font-semibold tabular-nums">{formatMoney(product.price)}</b>
          {product.usesSizes ? (
            <Link
              to={pagina}
              aria-label={`Escolher a numeração de ${product.name}`}
              className="inline-flex h-9 flex-none items-center gap-0.5 rounded-md border border-line-2 pr-1.5 pl-2.5 text-[12.5px] font-medium text-ink-2 transition-colors duration-100 hover:border-ink hover:bg-ink hover:text-surface"
            >
              Nº <ChevronRight size={15} aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={esgotado}
              aria-label={quantidade ? `Adicionar mais um ${product.name} (${quantidade} no carrinho)` : `Adicionar ${product.name} ao carrinho`}
              className="grid size-9 flex-none place-items-center rounded-md border border-line-2 text-ink-2 transition-colors duration-100 enabled:hover:border-ink enabled:hover:bg-ink enabled:hover:text-surface disabled:opacity-40"
            >
              <ShoppingCart size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default CardProduto;
