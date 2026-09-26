import { AlarmClock, Coins, PiggyBank, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardTitle } from "../../components/ui/Card";
import { corDoNivel } from "../../components/ui/corDoNivel";
import { hintClass } from "../../components/ui/styles";
import { NIVEIS } from "../../regras";
import { formatDay, formatMoney, formatNumber } from "../../utils/format";
import type { ClientDashboard } from "../../types";
import { TONS } from "../dashboard/tons";
import { Indicador } from "./pecas";


// Aba "Pontos" do Meu perfil: o equivalente às "moedas" das lojas online. Saldo, validade por lote e
// nível, com as regras explicadas em uma linha cada. O extrato fica na aba ao lado (Extrato.tsx).
function MeusPontos({ account }: { account: ClientDashboard }) {
  return (
    <div className="flex flex-col gap-4">
      {account.expiring.points > 0 && account.expiring.nextDate && (
        <div className={`flex flex-wrap items-center gap-3 rounded-[10px] border px-4 py-3 text-[13.5px] ${TONS.ambar.painel}`} role="status">
          <AlarmClock size={18} className={TONS.ambar.icone} aria-hidden />
          <span className="flex-1">
            <b className="font-semibold">{formatNumber(account.expiring.points)} pontos</b> vencem nos próximos{" "}
            {account.expiring.days} dias (o primeiro lote em {formatDay(account.expiring.nextDate)}).
          </span>
          <Link to="/loja" className="font-medium underline underline-offset-[3px]">Usar agora</Link>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
        <Indicador tom="azul" icone={<Coins size={17} />} rotulo="Saldo" valor={`${formatNumber(account.points)} pts`}
          detalhe={`vale ${formatMoney(account.redeemableValue)} de desconto`} />
        <Indicador tom="ambar" icone={<AlarmClock size={17} />} rotulo={`Vencem em ${account.expiring.days} dias`}
          valor={`${formatNumber(account.expiring.points)} pts`} detalhe="cada compra vale 12 meses" />
        <Indicador tom="verde" icone={<PiggyBank size={17} />} rotulo="Você já economizou" valor={formatMoney(account.savings)}
          detalhe={`${formatNumber(account.totalRedeemed)} pts usados`} />
        <Indicador tom="violeta" icone={<TrendingUp size={17} />} rotulo="Ganhos no total" valor={`${formatNumber(account.totalEarned)} pts`}
          detalhe={`em ${formatNumber(account.totalPurchases)} compras`} />
      </div>

      <section className="grid grid-cols-2 gap-4 *:min-w-0 max-[1000px]:grid-cols-[minmax(0,1fr)]">
        <Card className="p-[18px]">
          <CardTitle>Seu nível · {account.level}</CardTitle>
          <ul className="flex flex-col">
            {NIVEIS.map((nivel) => (
              <li
                key={nivel.nome}
                className={`flex items-center justify-between border-b border-line py-2 text-[13px] last:border-0 ${nivel.nome === account.level ? "font-semibold" : "text-muted"}`}
              >
                {/* A exigência vai embaixo do nome (e não numa coluna do meio) para caber no celular sem quebrar. */}
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${corDoNivel(nivel.nome)}`} aria-hidden />
                    {nivel.nome}
                    {nivel.nome === account.level && <small className="text-xs font-normal text-faint">(você)</small>}
                  </span>
                  <small className="pl-4 text-xs font-normal text-muted">
                    {nivel.minimo === 0 ? "desde a 1ª compra" : `${formatNumber(nivel.minimo)} pts em 12 meses`}
                  </small>
                </span>
                <span className="flex-none text-right">{nivel.bonus > 0 ? `+${nivel.bonus}% pontos` : "1 pt por real"}</span>
              </li>
            ))}
          </ul>
          <p className={hintClass}>Cada 100 pts viram R$ 5,00 de desconto, na loja online ou no caixa.</p>
        </Card>

        <Card className="p-[18px]">
          <CardTitle>Validade dos seus pontos</CardTitle>
          {account.lots.length === 0 ? (
            <p className={hintClass}>Nenhum ponto válido no momento.</p>
          ) : (
            <ul className="max-h-72 overflow-auto pr-2">
              {account.lots.map((lote, index) => (
                <li key={`${lote.expiresAt}-${index}`} className="flex justify-between border-b border-line py-2 text-[13px] first:pt-0 last:border-0 last:pb-0">
                  <b className="font-semibold tabular-nums">{formatNumber(lote.points)} pts</b>
                  <span className="text-muted">vencem em {formatDay(lote.expiresAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

export default MeusPontos;
