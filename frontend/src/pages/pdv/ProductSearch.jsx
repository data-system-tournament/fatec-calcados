import { useState } from "react";
import { Search } from "lucide-react";
import { formatMoney, normalizeText } from "../../utils/format";

const MAX_RESULTS = 6;

function searchProducts(products, query) {
  const text = normalizeText(query.trim());
  if (!text) return [];

  return products
    .filter((p) => normalizeText(p.name).includes(text) || p.sku.includes(text))
    .slice(0, MAX_RESULTS);
}

function ProductSearch({ products, onAdd, inputRef }) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const results = searchProducts(products, query);

  function addProduct(product) {
    onAdd(product);
    setQuery("");
    setHighlighted(0);
  }

  function handleChange(event) {
    setQuery(event.target.value);
    setHighlighted(0);
  }

  function handleKeyDown(event) {
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
    <div className="search">
      <Search size={18} className="ic" />
      <input
        ref={inputRef}
        value={query}
        placeholder="Bipar código ou buscar produto"
        aria-label="Buscar produto"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <kbd className="search-kbd">F2</kbd>

      {query.trim() && (
        <ul className="results" role="listbox">
          {results.length === 0 && (
            <li className="empty">
              {products.length === 0
                ? "Nenhum produto cadastrado."
                : `Nenhum produto com “${query}”. Confira o código ou o nome.`}
            </li>
          )}

          {results.map((product, index) => (
            <li
              key={product.sku}
              role="option"
              aria-selected={index === highlighted}
              className={index === highlighted ? "hi" : ""}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                addProduct(product);
              }}
            >
              <span>{product.name}<small>{product.sku}</small></span>
              <b>{formatMoney(product.price)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductSearch;
