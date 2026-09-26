import { AlarmClock, Coins, PiggyBank, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardTitle } from "../../components/ui/Card";
import { corDoNivel } from "../../components/ui/corDoNivel";
import { hintClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { formatDay, formatMoney, formatNumber } from "../../utils/format";
import { TONS } from "../dashboard/tons";
import { Indicador, ProgressoDoNivel } from "./pecas";

const MOVIMENTOS = { ACUMULO: "Ganhou", RESGATE: "Usou", EXPIRACAO: "Venceram" };

// Copiado de regras.py (NIVEIS): pontos acumulados em 12 meses para chegar ao nível e o bônus. Mude junto.
const NIVEIS = [
  { nome: "Bronze", minimo: 0, bonus: 0 },
  { nome: "Prata", minimo: 1000, bonus: 10 },
  { nome: "Ouro", minimo: 5000, bonus: 20 },
];

// "Minha conta › Meus pontos": o equivalente às "moedas" das lojas online. Saldo, validade por lote,
// nível e extrato, com as regras explicadas em uma linha cada.
function MeusPontos() {
  const { account } = useConta();
  if (!account) return null;

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
          <ProgressoDoNivel account={account} />
          <ul className="mt-4 flex flex-col">
            {NIVEIS.map((nivel) => (
              <li
                key={nivel.nome}
                className={`flex items-center justify-between border-b border-line py-2 text-[13px] last:border-0 ${nivel.nome === account.level ? "font-semibold" : "text-muted"}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${corDoNivel(nivel.nome)}`} aria-hidden />
                  {nivel.nome}
                  {nivel.nome === account.level && <small className="text-xs font-normal text-faint">(você)</small>}
                </span>
                <span>{nivel.minimo === 0 ? "desde a 1ª compra" : `${formatNumber(nivel.minimo)} pts em 12 meses`}</span>
                <span className="w-24 text-right">{nivel.bonus > 0 ? `+${nivel.bonus}% pontos` : "1 pt por real"}</span>
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

      <Card className="p-[18px]">
        <CardTitle>Extrato</CardTitle>
        {account.movements.length === 0 ? (
          <p className={hintClass}>Seus pontos aparecem aqui depois da primeira compra.</p>
        ) : (
          <ul className="max-h-96 overflow-auto pr-2">
            {account.movements.map((movimento, index) => (
              <li key={`${movimento.date}-${index}`} className="flex justify-between border-b border-line py-2 text-[13px] first:pt-0 last:border-0 last:pb-0">
                <span>
                  {MOVIMENTOS[movimento.type]}
                  <small className="ml-2 text-xs text-faint">{formatDay(movimento.date)}</small>
                </span>
                <b className={`font-semibold tabular-nums ${movimento.points > 0 ? "text-ok" : "text-danger"}`}>
                  {movimento.points > 0 ? "+" : "−"}{formatNumber(Math.abs(movimento.points))}
                </b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default MeusPontos;
