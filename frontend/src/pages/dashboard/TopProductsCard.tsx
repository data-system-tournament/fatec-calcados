import { ShoppingBag } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import type { SalesSummary } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import CardHeading from "./CardHeading";
import { TONS } from "./tons";

// O primeiro lugar leva o ouro; os outros ficam neutros. A barra compara as unidades com o mais vendido.
function TopProductsCard({ products }: { products: SalesSummary["topProducts"] }) {
  const maisVendido = Math.max(1, ...products.map((product) => product.units));

  return (
    <Card className="p-[18px]">
      <CardHeading icon={ShoppingBag} tom="ciano" title="Produtos mais vendidos" subtitle="Por unidades no período" />
      {products.length === 0 ? (
        <p className={hintClass}>Nenhuma venda nesse período.</p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {products.map((product, index) => (
            <li key={product.sku} className="grid grid-cols-[24px_1fr_auto] items-center gap-x-3 gap-y-1.5 text-[13px]">
              <span
                className={`grid size-6 place-items-center rounded-md text-xs font-semibold ${index === 0 ? "bg-accent text-[#18181B]" : "bg-subtle text-muted"}`}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{product.name}</span>
                <small className="block text-xs text-muted">{product.sku}</small>
              </span>
              <span className="text-right text-muted">
                <b className="font-semibold text-ink">{formatNumber(product.units)} un.</b> · {formatMoney(product.revenue)}
              </span>
              <div className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                <div className={`h-full rounded-full ${TONS.ciano.barra}`} style={{ width: `${(product.units / maisVendido) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default TopProductsCard;
