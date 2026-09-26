import { ChevronRight, Coins, Package, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { useConta } from "../../contexts/conta";
import { paymentLabel } from "../../config";
import type { ClientDashboard } from "../../types";
import { formatDay, formatMoney, formatNumber, plural } from "../../utils/format";
import { TONS, type Tom } from "../dashboard/tons";
import { ProgressoDoNivel } from "./pecas";

// "Minha conta › Resumo", no formato das contas de loja online (Mercado Livre, Shopee): quem é o cliente,
// o nível, e um cartão por seção (compras, pontos, dados) com o essencial e o link para a seção.
function MinhaConta() {
  const { account } = useConta();
  if (!account) return null;

  const ultima = account.purchases[0];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-5 p-[18px]">
        <div className="flex items-center gap-4">
          <span className="grid size-14 flex-none place-items-center rounded-full bg-violeta-soft text-lg font-semibold text-violeta" aria-hidden>
            {iniciais(account.name)}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2.5 text-xl font-semibold tracking-[-.015em]">
              {account.name} <LevelBadge level={account.level} />
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Cliente desde {formatDay(account.registeredAt)}
              {account.bonusPercent > 0 && ` · ganha ${account.bonusPercent}% a mais de pontos por ser ${account.level}`}
            </p>
          </div>
        </div>
        <div className="w-[300px] max-w-full">
          <ProgressoDoNivel account={account} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
        <Secao
          to="/minha-conta/compras"
          tom="ciano"
          icone={Package}
          titulo="Minhas compras"
          resumo={`${formatNumber(account.totalPurchases)} ${plural(account.totalPurchases, "compra", "compras")} · ${formatMoney(account.totalSpent)}`}
        >
          {ultima ? (
            <>
              Última: {formatDay(ultima.date)} · {formatMoney(ultima.paid)}
              <br />
              {ultima.register ?? "Loja"} · {paymentLabel(ultima.payment)}
            </>
          ) : (
            "Você ainda não comprou."
          )}
        </Secao>

        <Secao
          to="/minha-conta/pontos"
          tom="azul"
          icone={Coins}
          titulo="Meus pontos"
          resumo={`${formatNumber(account.points)} pts`}
        >
          {account.redeemableValue > 0 ? `Valem ${formatMoney(account.redeemableValue)} de desconto` : "A cada 100 pts, R$ 5,00 de desconto"}
          <br />
          {account.expiring.points > 0 ? (
            <span className={TONS.ambar.icone}>{formatNumber(account.expiring.points)} pts vencem em {account.expiring.days} dias</span>
          ) : (
            `Você já economizou ${formatMoney(account.savings)}`
          )}
        </Secao>

        <Secao to="/minha-conta/dados" tom="esmeralda" icone={ShieldCheck} titulo="Meus dados" resumo={account.name.split(" ")[0]}>
          CPF {account.cpf}
          <br />
          Dados pessoais e alterar senha
        </Secao>
      </div>
    </div>
  );
}

function Secao({ to, tom, icone: Icone, titulo, resumo, children }: {
  to: string;
  tom: Tom;
  icone: LucideIcon;
  titulo: string;
  resumo: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-[18px] shadow-card transition-colors hover:border-line-2"
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-[14px] font-medium">
          <span className={`grid size-8 place-items-center rounded-md ${TONS[tom].chip}`} aria-hidden>
            <Icone size={17} />
          </span>
          {titulo}
        </span>
        <ChevronRight size={17} className="text-faint transition-colors group-hover:text-ink" aria-hidden />
      </span>
      <strong className="text-[20px] leading-tight font-semibold tracking-[-.02em] tabular-nums">{resumo}</strong>
      <span className="text-[13px] leading-relaxed text-muted">{children}</span>
    </Link>
  );
}

function iniciais(nome: ClientDashboard["name"]): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default MinhaConta;
