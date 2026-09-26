import { Package, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import { paymentLabel } from "../../config";
import { useConta } from "../../contexts/conta";
import { formatMoney, formatNumber } from "../../utils/format";
import SaleDetailModal from "../vendas/SaleDetailModal";

// Nome do caixa da loja online (backend: services.caixa_online).
const CAIXA_ONLINE = "Loja online";

const ABAS = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "online", rotulo: "Loja online" },
  { valor: "fisica", rotulo: "Lojas físicas" },
] as const;
type Aba = (typeof ABAS)[number]["valor"];

const abaBase = "border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ";
const abaAtiva = "border-ink text-ink";
const abaInativa = "border-transparent text-muted hover:text-ink";

// "Minha conta › Minhas compras": como a lista de pedidos das lojas online, com abas por canal (a compra no
// caixa da loja também aparece, porque os pontos são os mesmos) e um cartão por compra com "Ver detalhes".
function MinhasCompras() {
  const { account } = useConta();
  const [aba, setAba] = useState<Aba>("todas");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  if (!account) return null;

  const compras = account.purchases.filter((p) =>
    aba === "todas" ? true : aba === "online" ? p.register === CAIXA_ONLINE : p.register !== CAIXA_ONLINE,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-line" role="tablist" aria-label="Filtrar compras">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            role="tab"
            aria-selected={aba === a.valor}
            className={abaBase + (aba === a.valor ? abaAtiva : abaInativa)}
            onClick={() => setAba(a.valor)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {compras.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Package size={28} className="text-faint" aria-hidden />
          <p className={hintClass}>Nenhuma compra aqui ainda.</p>
          <Link to="/loja" className="rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-surface">Ver produtos</Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {compras.map((compra) => {
            const online = compra.register === CAIXA_ONLINE;
            return (
              <li key={compra.id}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg px-[18px] py-2.5 text-[13px]">
                    <span className="font-medium">
                      {new Date(compra.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      {online ? <Package size={14} aria-hidden /> : <Store size={14} aria-hidden />}
                      {online ? "Compra online" : `Na loja · ${compra.register ?? "caixa"}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 px-[18px] py-4">
                    <div className="text-[13.5px]">
                      <b className="text-base font-semibold tabular-nums">{formatMoney(compra.paid)}</b>
                      <span className="ml-2 text-muted">{paymentLabel(compra.payment)}</span>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-[13px]">
                        {compra.pointsEarned > 0 && <span className="text-ok">+{formatNumber(compra.pointsEarned)} pts ganhos</span>}
                        {compra.pointsRedeemed > 0 && (
                          <span className="text-danger">
                            −{formatNumber(compra.pointsRedeemed)} pts usados ({formatMoney(compra.discount)} de desconto)
                          </span>
                        )}
                      </p>
                    </div>
                    <Button onClick={() => setOpenSaleId(compra.id)}>Ver detalhes</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-faint">Mostrando as {account.purchases.length} compras mais recentes.</p>

      {openSaleId && <SaleDetailModal saleId={openSaleId} onClose={() => setOpenSaleId(null)} doCliente />}
    </div>
  );
}

export default MinhasCompras;
