import { formatMoney, formatNumber, plural } from "../../utils/format";

type SaleTotalsProps = {
  itemCount: number;
  subtotal: number;
  pointsUsed: number;
  pointsDiscount: number;
  total: number;
};

// Resumo da venda logo acima do botão de finalizar; o desconto só aparece quando há pontos usados.
function SaleTotals({ itemCount, subtotal, pointsUsed, pointsDiscount, total }: SaleTotalsProps) {
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <div className="flex justify-between text-muted">
        <span>Subtotal · {itemCount} {plural(itemCount, "item", "itens")}</span>
        <span className="tabular-nums">{formatMoney(subtotal)}</span>
      </div>
      {pointsUsed > 0 && (
        <div className="flex justify-between text-ok">
          <span>Desconto em pontos ({formatNumber(pointsUsed)} pts)</span>
          <span className="tabular-nums">− {formatMoney(pointsDiscount)}</span>
        </div>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-medium text-muted">Total</span>
        <strong className="text-[32px] leading-none font-semibold tracking-[-.03em] tabular-nums">{formatMoney(total)}</strong>
      </div>
    </div>
  );
}

export default SaleTotals;
