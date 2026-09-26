import { useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { Search } from "lucide-react";
import { Kbd } from "../../components/ui/Kbd";
import type { Product } from "../../types";
import { formatMoney, normalizeText } from "../../utils/format";
import { iconeDoProduto } from "./categorias";

const MAX_RESULTS = 6;

function searchProducts(products: Product[], query: string) {
  const text = normalizeText(query.trim());
  if (!text) return [];

  return products
    .filter((p) => normalizeText(p.name).includes(text) || p.sku.includes(text))
    .slice(0, MAX_RESULTS);
}

type ProductSearchProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

function ProductSearch({ products, onAdd, inputRef }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const results = searchProducts(products, query);

  function addProduct(product: Product) {
    onAdd(product);
    setQuery("");
    setHighlighted(0);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setHighlighted(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted(Math.min(highlighted + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(Math.max(highlighted - 1, 0));
    }
    if (event.key === "Enter" && results[highlighted]) {
      addProduct(results[highlighted]);
    }
    if (event.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div className="relative flex items-center">
      <Search size={19} className="pointer-events-none absolute left-4 text-faint" aria-hidden="true" />
      {/* Feito com IA: combobox com aria-activedescendant, como a paleta Ctrl/⌘ K. O foco fica no campo
          (é nele que o leitor de código de barras escreve) e o leitor de tela anuncia a opção das setas. */}
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={query.trim() !== ""}
        aria-controls="produtos-encontrados"
        aria-activedescendant={results[highlighted] ? `produto-${results[highlighted].sku}` : undefined}
        className="w-full rounded-xl border border-line-2 bg-surface py-3.5 pr-[52px] pl-12 text-[15px] shadow-card transition-[border-color,box-shadow] duration-100 focus:border-ink focus:shadow-[0_0_0_3px_var(--subtle)] focus:outline-none"
        value={query}
        placeholder="Bipar código ou buscar produto"
        aria-label="Buscar produto"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <Kbd className="absolute right-3.5">F2</Kbd>

      {query.trim() && (
        <ul
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-[5] rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          id="produtos-encontrados"
          role="listbox"
          aria-label="Produtos encontrados"
        >
          {results.length === 0 && (
            <li className="flex justify-between rounded-lg px-3 py-2.5 text-[13.5px] text-muted" role="option" aria-disabled="true" aria-selected="false">
              {products.length === 0
                ? "Nenhum produto cadastrado."
                : `Nenhum produto com “${query}”. Confira o código ou o nome.`}
            </li>
          )}

          {results.map((product, index) => {
            const Icone = iconeDoProduto(product.name);
            return (
            <li
              key={product.sku}
              id={`produto-${product.sku}`}
              role="option"
              aria-selected={index === highlighted}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] ${index === highlighted ? "bg-subtle" : ""}`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                addProduct(product);
              }}
            >
              <span className="grid size-8 flex-none place-items-center rounded-md bg-subtle text-muted">
                <Icone size={16} strokeWidth={1.6} aria-hidden />
              </span>
              <span className="flex-1">{product.name}<small className="ml-2.5 text-xs text-muted">{product.sku}</small></span>
              <b className="font-semibold tabular-nums">{formatMoney(product.price)}</b>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ProductSearch;
