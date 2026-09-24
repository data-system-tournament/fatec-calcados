import { BLOCK_VALUE, POINTS_PER_BLOCK } from "../../config";
import { formatMoney, formatNumber } from "../../utils/format";

function pointsToMoney(points) {
  return (points / POINTS_PER_BLOCK) * BLOCK_VALUE;
}

function PointsPanel({ client, hasItems, pointsUsed, maxRedeem, pointsEarned, onChangeRedeem }) {
  const balanceAfter = client.points - pointsUsed + pointsEarned;

  return (
    <div className="points-box">
      <div className="pb-row">
        <span>Saldo</span>
        <b>{formatNumber(client.points)} pts</b>
      </div>
      <small>dá para usar até {formatMoney(pointsToMoney(client.redeemablePoints))}</small>

      {hasItems && maxRedeem > 0 && (
        <div className="pb-redeem">
          <span>Usar nesta compra</span>
          <div className="stepper">
            <button
              aria-label="Usar 100 pontos a menos"
              disabled={pointsUsed === 0}
              onClick={() => onChangeRedeem(pointsUsed - POINTS_PER_BLOCK)}
            >
              −
            </button>
            <b>{formatNumber(pointsUsed)} pts</b>
            <button
              aria-label="Usar 100 pontos a mais"
              disabled={pointsUsed >= maxRedeem}
              onClick={() => onChangeRedeem(pointsUsed + POINTS_PER_BLOCK)}
            >
              +
            </button>
          </div>
          <small>{pointsUsed > 0 ? `desconto de ${formatMoney(pointsToMoney(pointsUsed))}` : "sem desconto"}</small>
          {pointsUsed < maxRedeem
            ? <button className="link" onClick={() => onChangeRedeem(maxRedeem)}>usar o máximo ({formatNumber(maxRedeem)} pts)</button>
            : <button className="link" onClick={() => onChangeRedeem(0)}>não usar</button>}
        </div>
      )}

      {hasItems && (
        <>
          <hr />
          <div className="pb-row">
            <span>Vai ganhar</span>
            <b className="pb-plus">+{formatNumber(pointsEarned)} pts</b>
          </div>
          {client.bonusPercent > 0 && <small>inclui bônus {client.level} de {client.bonusPercent}%</small>}
          <div className="pb-row">
            <span>Saldo depois</span>
            <b>{formatNumber(balanceAfter)} pts</b>
          </div>
        </>
      )}
    </div>
  );
}

export default PointsPanel;
