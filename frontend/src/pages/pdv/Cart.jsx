import { Trash2 } from "lucide-react";
import { formatMoney } from "../../utils/format";

function Cart({ items, selectedSku, onSelect, onChangeQuantity, onRemove }) {
  return (
    <div className="cart">
      <div className="cart-h">
        <span>Item</span>
        <span>Qtd</span>
        <span>Valor</span>
        <span />
      </div>

      {items.length === 0 && (
        <p className="empty-cart">Bipe um produto ou busque pelo nome para começar a venda.</p>
      )}

      {items.map((item) => (
        <div
          key={item.sku}
          className={item.sku === selectedSku ? "cart-row sel" : "cart-row"}
          onClick={() => onSelect(item.sku)}
        >
          <span className="nm">
            {item.product.name}
            <small>{formatMoney(item.product.price)} un.</small>
          </span>

          <span className="qty" onClick={(event) => event.stopPropagation()}>
            <button aria-label="Diminuir" onClick={() => onChangeQuantity(item.sku, -1)}>−</button>
            <b>{item.quantity}</b>
            <button aria-label="Aumentar" onClick={() => onChangeQuantity(item.sku, 1)}>+</button>
          </span>

          <span className="val">{formatMoney(item.product.price * item.quantity)}</span>

          <button
            className="cart-remove"
            aria-label={`Remover ${item.product.name}`}
            title="Remover item"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item.sku);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Cart;
