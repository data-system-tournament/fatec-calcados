import { Minus, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CartLine } from "../../types";
import { chaveDoItem } from "../../utils/carrinho";
import { formatMoney } from "../../utils/format";
import { iconeDoProduto } from "./categorias";

// Os itens são identificados pela chave (utils/carrinho.chaveDoItem): o mesmo tênis em dois números são dois itens.
type CartProps = {
  items: CartLine[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onChangeQuantity: (key: string, change: number) => void;
  onRemove: (key: string) => void;
};

function Cart({ items, selectedKey, onSelect, onChangeQuantity, onRemove }: CartProps) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const key = chaveDoItem(item);
        const selected = key === selectedKey;
        const Icone = iconeDoProduto(item.product.name);
        return (
          <li
            key={key}
            className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-2 transition-colors duration-100 ${selected ? "border-ink bg-surface" : "border-line bg-surface hover:border-line-2"}`}
            onClick={() => onSelect(key)}
          >
            <span className="grid size-9 flex-none place-items-center rounded-lg bg-subtle text-muted">
              <Icone size={18} strokeWidth={1.6} aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{item.product.name}</span>
              <small className="block text-xs text-muted tabular-nums">
                {item.size !== null && <b className="font-semibold text-ink">Nº {item.size} · </b>}
                {formatMoney(item.product.price)} un. · {item.sku}
              </small>
            </span>

            <span
              className="flex flex-none items-center rounded-lg border border-line-2 bg-bg p-0.5"
              role="group"
              aria-label={`Quantidade de ${item.product.name}`}
              onClick={(event) => event.stopPropagation()}
            >
              <QuantityButton label={`Tirar um ${item.product.name}`} disabled={item.quantity <= 1} onClick={() => onChangeQuantity(key, -1)}>
                <Minus size={14} aria-hidden />
              </QuantityButton>
              {/* aria-live: quem usa leitor de tela ouve a nova quantidade depois de apertar − ou +. */}
              <b className="min-w-7 text-center text-[14px] font-semibold tabular-nums" aria-live="polite">{item.quantity}</b>
              <QuantityButton label={`Mais um ${item.product.name}`} onClick={() => onChangeQuantity(key, 1)}>
                <Plus size={14} aria-hidden />
              </QuantityButton>
            </span>

            <span className="w-[104px] flex-none text-right text-[14px] font-semibold tabular-nums max-[860px]:w-[88px]">
              {formatMoney(item.product.price * item.quantity)}
            </span>

            <button
              className="grid size-8 flex-none place-items-center rounded-md text-faint hover:bg-danger-soft hover:text-danger"
              aria-label={`Remover ${item.product.name}`}
              title="Remover item"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(key);
              }}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type QuantityButtonProps = { label: string; onClick: () => void; disabled?: boolean; children: ReactNode };

function QuantityButton({ label, onClick, disabled = false, children }: QuantityButtonProps) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-md text-muted enabled:hover:bg-surface enabled:hover:text-ink disabled:opacity-30"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Cart;
