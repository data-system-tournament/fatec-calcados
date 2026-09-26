import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { hintClass, tdClass, thClass } from "../../components/ui/styles";
import { paymentLabel } from "../../config";
import { useCarregar } from "../../hooks/useCarregar";
import { fetchClientProfile } from "../../services/api";
import type { ClientProfile } from "../../types";
import { formatDay, formatDateTime, formatMoney, formatNumber } from "../../utils/format";
import SaleDetailModal from "../vendas/SaleDetailModal";

const MOVEMENT_LABELS = { ACUMULO: "Acúmulo", RESGATE: "Resgate", EXPIRACAO: "Expiração" };

function ClientePerfil() {
  const id = Number(useParams().id);
  const { data, error, retry } = useCarregar(() => fetchClientProfile(id), String(id));

  return (
    <div className="flex flex-col gap-4">
      <Link to="/admin/clientes" className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Clientes
      </Link>

      {error && !data && <ErrorState title="Não foi possível carregar o cliente" message={error} onRetry={retry} />}
      {!data && !error && <p className={hintClass} role="status">Carregando o cliente...</p>}
      {data && <Perfil client={data} />}
    </div>
  );
}

function Perfil({ client }: { client: ClientProfile }) {
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-[18px]">
        <div>
          <h2 className="flex flex-wrap items-center gap-2.5 text-xl font-semibold tracking-[-.015em]">
            {client.name} <LevelBadge level={client.level} />
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            CPF {client.cpf} · cliente desde {formatDay(client.registeredAt)}
            {client.registeredStore && ` · cadastrado na ${client.registeredStore}`}
          </p>
        </div>
        <LevelProgress client={client} />
      </Card>

      <Card className="grid grid-cols-4 max-[1100px]:grid-cols-2">
        <Stat label="Saldo de pontos" value={`${formatNumber(client.points)} pts`} detail={`dá para usar até ${formatMoney(client.redeemableValue)}`} first />
        <Stat label="Total gasto" value={formatMoney(client.totalSpent)} detail={`${client.totalPurchases} compras`} />
        <Stat label="Pontos ganhos" value={formatNumber(client.totalEarned)} detail="em todas as compras" />
        <Stat label="Pontos resgatados" value={formatNumber(client.totalRedeemed)} detail="em descontos" />
      </Card>

      <section className="grid grid-cols-2 gap-4 *:min-w-0 max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <Card className="p-[18px]">
          <CardTitle>Pontos a vencer · por lote</CardTitle>
          {client.lots.length === 0 ? (
            <p className={hintClass}>Nenhum ponto válido no momento.</p>
          ) : (
            <ul className="max-h-64 overflow-auto pr-2">
              {client.lots.map((lot, index) => (
                <li key={`${lot.expiresAt}-${index}`} className="flex justify-between border-b border-line py-2 text-[13px] first:pt-0 last:border-0 last:pb-0">
                  <b className="font-semibold">{formatNumber(lot.points)} pts</b>
                  <span className="text-muted">vencem em {formatDay(lot.expiresAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-[18px]">
          <CardTitle>Extrato de pontos · últimos movimentos</CardTitle>
          {client.movements.length === 0 ? (
            <p className={hintClass}>Sem movimentos ainda.</p>
          ) : (
            <ul className="max-h-64 overflow-auto pr-2">
              {client.movements.map((movement, index) => (
                <li key={`${movement.date}-${index}`} className="flex justify-between border-b border-line py-2 text-[13px] first:pt-0 last:border-0 last:pb-0">
                  <span>{MOVEMENT_LABELS[movement.type]}<small className="ml-2 text-xs text-muted">{formatDay(movement.date)}</small></span>
                  <b className={`font-semibold ${movement.points > 0 ? "text-ok" : "text-danger"}`}>
                    {movement.points > 0 ? "+" : "−"}{formatNumber(Math.abs(movement.points))}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card className="p-[18px]">
        <CardTitle>Compras · as {client.purchases.length} mais recentes</CardTitle>
        {client.purchases.length === 0 ? (
          <p className={hintClass}>Este cliente ainda não comprou.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={`${thClass} text-left`}>Data</th>
                  <th className={`${thClass} text-left`}>Caixa</th>
                  <th className={`${thClass} text-left`}>Pagamento</th>
                  <th className={`${thClass} text-right`}>Valor pago</th>
                  <th className={`${thClass} text-right`}>Pontos</th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {client.purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-subtle">
                    <td className={tdClass}>
                      <button
                        className="font-medium underline-offset-[3px] hover:underline"
                        onClick={() => setOpenSaleId(purchase.id)}
                        aria-label={`Ver compra de ${formatDateTime(purchase.date)}`}
                      >
                        {formatDateTime(purchase.date)}
                      </button>
                    </td>
                    <td className={tdClass}>{purchase.register ?? "—"}</td>
                    <td className={tdClass}>{paymentLabel(purchase.payment)}</td>
                    <td className={`${tdClass} text-right`}>{formatMoney(purchase.paid)}</td>
                    <td className={`${tdClass} text-right`}>
                      {purchase.pointsEarned > 0 && <span className="text-ok">+{formatNumber(purchase.pointsEarned)}</span>}
                      {purchase.pointsRedeemed > 0 && <span className="ml-1.5 text-danger">−{formatNumber(purchase.pointsRedeemed)}</span>}
                      {purchase.pointsEarned === 0 && purchase.pointsRedeemed === 0 && <span className="text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openSaleId && <SaleDetailModal saleId={openSaleId} onClose={() => setOpenSaleId(null)} />}
    </>
  );
}

// Progresso até o próximo nível: pontos acumulados em 12 meses ÷ pontos que o próximo nível exige.
function LevelProgress({ client }: { client: ClientProfile }) {
  const next = client.nextLevel;
  const percent = next ? Math.min(100, Math.round((100 * client.points12m) / (client.points12m + next.missing))) : 100;

  return (
    <div className="w-[260px] max-w-full text-[13px]">
      <div className="flex justify-between text-muted">
        <span>{formatNumber(client.points12m)} pts em 12 meses</span>
        <span>{client.bonusPercent > 0 ? `+${client.bonusPercent}% em pontos` : "1 ponto por real"}</span>
      </div>
      <div
        className="my-1.5 h-2 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso até o próximo nível"
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
      <small className="text-xs text-muted">
        {next ? `Faltam ${formatNumber(next.missing)} pts para o nível ${next.name}` : "Nível máximo"}
      </small>
    </div>
  );
}

function Stat({ label, value, detail, first = false }: { label: string; value: string; detail: string; first?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 px-5 py-[18px] max-[860px]:px-4 max-[860px]:py-3.5 ${first ? "" : "border-l border-line"}`}>
      <span className="text-[13px] text-muted">{label}</span>
      <strong className="text-[24px] leading-[1.2] font-semibold tracking-[-.02em] max-[860px]:text-[20px]">{value}</strong>
      <small className="text-xs text-muted">{detail}</small>
    </div>
  );
}

export default ClientePerfil;
