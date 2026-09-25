import { useRef, useState } from "react";
import { Kbd } from "../../components/ui/Kbd";
import { useCaixa } from "../../contexts/caixa";
import { useToast } from "../../contexts/toast";
import { useAtalhosPdv } from "../../hooks/useAtalhosPdv";
import { useCarrinho } from "../../hooks/useCarrinho";
import { errorMessage } from "../../services/api";
import type { Client, Sale } from "../../types";
import { plural } from "../../utils/format";
import Cart from "./Cart";
import ClientPanel from "./ClientPanel";
import ConnectionBar from "./ConnectionBar";
import PaymentMethods from "./PaymentMethods";
import PointsPanel from "./PointsPanel";
import ProductGrid from "./ProductGrid";
import ProductSearch from "./ProductSearch";
import SaleDoneModal from "./SaleDoneModal";
import SaleTotals from "./SaleTotals";

function Pdv() {
  const {
    openedAt, online, toggleOnline, pendingSales, products, finishSale: recordSale, clientRegistered,
    updateSale, resetSale,
  } = useCaixa();
  const notify = useToast();
  const carrinho = useCarrinho();
  const { hasItems, client, paymentMethod, items, selectedSku, setSelectedSku, pointsUsed, points } = carrinho;
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [sending, setSending] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function finishSale() {
    if (!hasItems || lastSale || sending) return;

    setSending(true);
    try {
      const recorded = await recordSale(carrinho.buildSale());
      // Limpa a venda já registrada na hora: se o atendente trocar de aba antes de fechar o
      // recibo, o carrinho vendido não pode voltar preenchido.
      resetSale();
      setSelectedSku(null);
      setLastSale(recorded);
    } catch (error) {
      notify(errorMessage(error));
    }
    setSending(false);
  }

  function startNewSale() {
    setLastSale(null);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleClientRegistered(newClient: Client) {
    updateSale({ client: newClient });
    clientRegistered(newClient);
  }

  useAtalhosPdv({ onSearch: () => searchInputRef.current?.focus(), onFinish: finishSale });

  const itemCount = items.reduce((soma, item) => soma + item.quantity, 0);
  const quantidades = Object.fromEntries(items.map((item) => [item.sku, item.quantity]));

  // Esquerda: o que está sendo vendido (busca, catálogo ou carrinho). Direita: o fechamento, na ordem
  // do atendimento (cliente, pontos, pagamento) e o resumo colado no botão de finalizar.
  return (
    <div className="flex h-[calc(100dvh-104px)] min-h-[600px] flex-col gap-3 max-[980px]:h-auto">
      <ConnectionBar openedAt={openedAt} online={online} pendingSales={pendingSales} onToggle={toggleOnline} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-[980px]:grid-cols-1">
        <section className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface shadow-card">
          <div className="border-b border-line p-4 sm:p-5">
            <ProductSearch products={products} onAdd={carrinho.addProduct} inputRef={searchInputRef} />
          </div>

          {/* O catálogo fica sempre à vista para somar vários produtos; o carrinho encosta embaixo dele. */}
          <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
            <h2 className="text-[15px] font-semibold tracking-[-.01em]">Produtos</h2>
            <span className="text-[12.5px] text-muted">Clique para adicionar ou bipe o código</span>
          </div>

          <div className="min-h-[180px] flex-1 overflow-auto px-5 pb-4">
            <ProductGrid products={products} quantidades={quantidades} onAdd={carrinho.addProduct} />
          </div>

          <div className="flex max-h-[40%] min-h-0 flex-none flex-col rounded-b-2xl border-t border-line bg-bg max-[980px]:max-h-none">
            <div className="flex items-baseline justify-between px-5 pt-3.5 pb-2">
              <h2 className="text-[15px] font-semibold tracking-[-.01em]">Carrinho</h2>
              <span className="text-[12.5px] text-muted">
                {hasItems ? `${itemCount} ${plural(itemCount, "item", "itens")}` : "vazio"}
              </span>
            </div>
            <div className="min-h-0 overflow-auto px-5 pb-4">
              {hasItems ? (
                <Cart
                  items={items}
                  selectedSku={selectedSku}
                  onSelect={setSelectedSku}
                  onChangeQuantity={carrinho.changeQuantity}
                  onRemove={carrinho.removeItem}
                />
              ) : (
                <p className="rounded-[10px] border border-dashed border-line-2 py-4 text-center text-[13px] text-muted">
                  Nenhum item ainda. Escolha os produtos acima.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Cliente, pontos e pagamento rolam; o resumo com o botão de finalizar fica sempre visível embaixo. */}
        <aside className="flex min-h-0 flex-col gap-3">
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-1 pb-1 max-[980px]:overflow-visible">
          <ClientPanel
            client={client}
            onSelect={(selected) => updateSale({ client: selected })}
            onClear={() => updateSale({ client: null })}
            onRegistered={handleClientRegistered}
          />

          {client && (
            <PointsPanel
              client={client}
              hasItems={hasItems}
              pointsUsed={pointsUsed}
              maxRedeem={carrinho.maxRedeem}
              pointsEarned={points}
              onChangeRedeem={(value) => updateSale({ pointsToRedeem: value })}
            />
          )}

          <PaymentMethods value={paymentMethod} onChange={(code) => updateSale({ paymentMethod: code })} />
          </div>

          <div className="flex flex-none flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
            <SaleTotals
              itemCount={itemCount}
              subtotal={carrinho.subtotal}
              pointsUsed={pointsUsed}
              pointsDiscount={carrinho.pointsDiscount}
              total={carrinho.total}
            />
            <button
              className="flex items-center justify-between rounded-xl bg-ink px-[18px] py-4 text-[15px] font-semibold text-surface transition-colors duration-100 enabled:hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-35"
              onClick={finishSale}
              disabled={!hasItems || sending}
            >
              <span>{sending ? "Enviando..." : "Finalizar venda"}</span><Kbd tone="onDark">F10</Kbd>
            </button>
          </div>
        </aside>
      </div>

      {lastSale && <SaleDoneModal sale={lastSale} onClose={startNewSale} />}
    </div>
  );
}

export default Pdv;
