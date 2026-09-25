import type { ReactNode } from "react";
import { LinkButton } from "../../components/ui/Button";
import { POINTS_PER_BLOCK, pointsToMoney } from "../../regras";
import type { Client } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import Secao from "./Secao";

const noteClass = "text-xs text-faint";

type PointsPanelProps = {
  client: Client;
  hasItems: boolean;
  pointsUsed: number;
  maxRedeem: number;
  pointsEarned: number;
  onChangeRedeem: (points: number) => void;
};

function PointsPanel({ client, hasItems, pointsUsed, maxRedeem, pointsEarned, onChangeRedeem }: PointsPanelProps) {
  const balanceAfter = client.points - pointsUsed + pointsEarned;

  return (
    <Secao titulo="Pontos">
    <div className="flex flex-col gap-[3px] text-[13px]">
      <div className="flex items-baseline justify-between">
        <b className="text-[22px] leading-none font-semibold tracking-[-.02em] tabular-nums">{formatNumber(client.points)} <span className="text-[13px] font-medium text-muted">pts</span></b>
        <small className={noteClass}>vale até {formatMoney(client.redeemableValue)}</small>
      </div>

      {hasItems && maxRedeem > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-subtle px-3 py-2.5 text-muted">
          <span>Usar nesta compra</span>
          <div className="flex items-center rounded-md border border-line-2 bg-surface">
            <StepButton
              label="Usar 100 pontos a menos"
              disabled={pointsUsed === 0}
              onClick={() => onChangeRedeem(pointsUsed - POINTS_PER_BLOCK)}
            >
              −
            </StepButton>
            <b className="min-w-[76px] text-center font-semibold text-ink">{formatNumber(pointsUsed)} pts</b>
            <StepButton
              label="Usar 100 pontos a mais"
              disabled={pointsUsed >= maxRedeem}
              onClick={() => onChangeRedeem(pointsUsed + POINTS_PER_BLOCK)}
            >
              +
            </StepButton>
          </div>
          <small className={`${noteClass} w-full`}>
            {pointsUsed > 0 ? `desconto de ${formatMoney(pointsToMoney(pointsUsed))}` : "sem desconto"}
          </small>
          {pointsUsed < maxRedeem
            ? <LinkButton onClick={() => onChangeRedeem(maxRedeem)}>usar o máximo ({formatNumber(maxRedeem)} pts)</LinkButton>
            : <LinkButton onClick={() => onChangeRedeem(0)}>não usar</LinkButton>}
        </div>
      )}

      {hasItems && (
        <>
          <hr className="mt-3 mb-2 w-full border-line" />
          <Row label="Vai ganhar" value={`+${formatNumber(pointsEarned)} pts`} positive />
          {client.bonusPercent > 0 && <small className={noteClass}>inclui bônus {client.level} de {client.bonusPercent}%</small>}
          <Row label="Saldo depois" value={`${formatNumber(balanceAfter)} pts`} />
        </>
      )}
    </div>
    </Secao>
  );
}

function Row({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-muted">
      <span>{label}</span>
      <b className={`text-[14px] font-semibold tabular-nums ${positive ? "text-ok" : "text-ink"}`}>{value}</b>
    </div>
  );
}

type StepButtonProps = { label: string; disabled: boolean; onClick: () => void; children: ReactNode };

function StepButton({ label, disabled, onClick, children }: StepButtonProps) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-7 w-[30px] rounded-[5px] text-base text-ink enabled:hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default PointsPanel;
