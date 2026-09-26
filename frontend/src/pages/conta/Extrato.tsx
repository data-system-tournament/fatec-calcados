import { Card, CardTitle } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import type { ClientDashboard } from "../../types";
import { formatDay, formatNumber } from "../../utils/format";

const MOVIMENTOS = { ACUMULO: "Ganhou", RESGATE: "Usou", EXPIRACAO: "Venceram" };

// Aba "Extrato" do Meu perfil: cada ponto que entrou (compra), saiu (resgate) ou venceu.
function Extrato({ account }: { account: ClientDashboard }) {
  return (
    <Card className="p-[18px]">
      <CardTitle>Extrato</CardTitle>
      {account.movements.length === 0 ? (
        <p className={hintClass}>Seus pontos aparecem aqui depois da primeira compra.</p>
      ) : (
        <ul>
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
  );
}

export default Extrato;
