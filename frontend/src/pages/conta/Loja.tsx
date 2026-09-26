import { ChevronRight, Coins, Search, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { inputClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { useCarrinhoOnline } from "../../hooks/useCarrinhoOnline";
import type { Product } from "../../types";
import { formatMoney, formatNumber, normalizeText, plural } from "../../utils/format";
import ProductGrid from "../pdv/ProductGrid";
import { CompreDeNovo } from "./pecas";

// Tela inicial do cliente (como a home das lojas online): faixa com os pontos, "compre de novo" e a vitrine,
// com o mesmo catálogo (e a mesma grade) do PDV. Cada clique soma uma unidade ao carrinho.
function Loja() {
  const { account, products, cart, addToCart } = useConta();
  const { itemCount, subtotal } = useCarrinhoOnline(0);
  const notify = useToast();
  const [busca, setBusca] = useState("");

  const termo = normalizeText(busca.trim());
  const visiveis = termo ? products.filter((p) => normalizeText(p.name).includes(termo) || p.sku.startsWith(termo)) : products;

  const quantidades: Record<string, number> = {};
  for (const item of cart) quantidades[item.sku] = item.quantity;

  function adicionar(product: Product) {
    addToCart(product);
    notify(`${product.name} no carrinho`);
  }

  return (
    <div className="flex flex-col gap-4">
      {account && (
        <Link
          to="/minha-conta/pontos"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] border border-app/20 bg-app-soft px-4 py-3 text-[13.5px] transition-colors hover:border-app/40"
        >
          <Coins size={18} className="flex-none text-app" aria-hidden />
          <span className="flex-1">
            Olá, <b className="font-semibold">{account.name.split(" ")[0]}</b>! Você tem{" "}
            <b className="font-semibold tabular-nums">{formatNumber(account.points)} pts</b>
            {account.redeemableValue > 0 && <> · vale {formatMoney(account.redeemableValue)} de desconto no carrinho</>}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-app">
            Meus pontos <ChevronRight size={15} aria-hidden />
          </span>
        </Link>
      )}

      {account && account.topProducts.length > 0 && (
        <section aria-label="Compre de novo" className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium text-muted">Compre de novo</h2>
          <CompreDeNovo account={account} />
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Compre online e ganhe pontos como no caixa. Dá para usar seus pontos no carrinho.</p>
        <label className="relative w-[280px] max-w-full">
          <span className="sr-only">Buscar produto</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className={`${inputClass} w-full pl-9`}
          />
        </label>
      </div>

      {termo && visiveis.length === 0 ? (
        <p className="py-12 text-center text-muted">Nenhum produto encontrado para “{busca}”.</p>
      ) : (
        <ProductGrid products={visiveis} quantidades={quantidades} onAdd={adicionar} />
      )}

      {itemCount > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 self-center rounded-full bg-ink py-2 pr-2 pl-5 text-[13.5px] text-surface shadow-pop">
          <span className="tabular-nums">
            {itemCount} {plural(itemCount, "item", "itens")} · {formatMoney(subtotal)}
          </span>
          <Link
            to="/loja/carrinho"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 font-medium text-ink"
          >
            <ShoppingCart size={15} aria-hidden /> Ver carrinho
          </Link>
        </div>
      )}
    </div>
  );
}

export default Loja;
