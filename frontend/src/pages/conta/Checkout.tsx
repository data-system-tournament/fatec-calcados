import { CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { errorClass, hintClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useCarrinhoOnline } from "../../hooks/useCarrinhoOnline";
import { POINTS_PER_BLOCK, pointsToMoney } from "../../regras";
import { buyOnline, errorMessage } from "../../services/api";
import type { OnlinePayment, OnlinePurchaseResult } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";

const PAGAMENTOS: { code: OnlinePayment; label: string; detail: string }[] = [
  { code: "PIX", label: "Pix", detail: "aprovação na hora" },
  { code: "CREDITO", label: "Cartão de crédito", detail: "pagamento simulado" },
];

const opcaoBase = "flex flex-1 cursor-pointer flex-col rounded-lg border px-3.5 py-2.5 text-[13px] transition-colors ";
const opcaoAtiva = "border-ink bg-subtle";
const opcaoInativa = "border-line hover:border-line-2";

// Carrinho da loja online: itens, forma de pagamento, quantos pontos usar (em blocos de 100) e o resumo.
// Os valores aqui são prévias (regras.ts); quem calcula de verdade é o backend, na resposta da compra.
function Checkout() {
  const { account, cart, changeQuantity, removeFromCart, clearCart, reload } = useConta();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<OnlinePayment>("PIX");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnlinePurchaseResult | null>(null);
  // Um id por tentativa de compra: se a resposta se perder e a pessoa clicar de novo, o backend não duplica.
  const [purchaseId, setPurchaseId] = useState(() => crypto.randomUUID());
  const { lines, itemCount, subtotal, maxRedeem, pointsUsed, discount, total, points } = useCarrinhoOnline(pointsToRedeem);

  if (!account) return null;

  async function finalizar() {
    setSending(true);
    setError("");
    try {
      const resposta = await buyOnline({ id: purchaseId, items: cart, payment, pointsToRedeem: pointsUsed });
      setResult(resposta);
      clearCart();
      setPointsToRedeem(0);
      setPurchaseId(crypto.randomUUID());
      void reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const confirmacao = result && (
      <Modal
        title="Compra confirmada"
        onClose={() => navigate("/loja")}
        footer={
          <>
            <Button onClick={() => navigate("/loja")}>Continuar comprando</Button>
            <Button variant="dark" autoFocus onClick={() => navigate("/minha-conta/compras")}>Ver minhas compras</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 py-2 text-center text-[13.5px]">
          <CheckCircle2 size={36} className="text-ok" aria-hidden />
          <p>
            Você pagou <b className="font-semibold">{formatMoney(result.total)}</b>
            {result.discount > 0 && <> e economizou <b className="font-semibold">{formatMoney(result.discount)}</b> com pontos</>}.
          </p>
          <p className="text-muted">
            Ganhou <b className="font-semibold text-ok">+{formatNumber(result.pointsEarned)} pts</b>
            {result.balance !== null && <> · saldo agora: {formatNumber(result.balance)} pts</>}
          </p>
        </div>
      </Modal>
  );

  if (lines.length === 0) {
    return (
      <>
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <h2 className="text-lg font-semibold">Seu carrinho está vazio</h2>
          <p className={hintClass}>Escolha seus produtos na loja e volte aqui para finalizar.</p>
          <Link to="/loja" className="mt-1 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-surface">
            Ir para a loja
          </Link>
        </Card>
        {confirmacao}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-[1.5fr_1fr] items-start gap-4 *:min-w-0 max-[900px]:grid-cols-[minmax(0,1fr)]">
        <Card className="p-[18px]">
          <CardTitle>Itens · {itemCount}</CardTitle>
          <ul>
            {lines.map((line) => (
              // No celular o nome ocupa a linha de cima e os controles descem, para o nome não virar "Tênis R...".
              <li key={line.sku} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3 text-[13.5px] first:pt-0 last:border-0 last:pb-0">
                <span className="min-w-0 flex-1 max-[520px]:basis-full">
                  <span className="block truncate font-medium">{line.product.name}</span>
                  <small className="text-xs text-muted">{formatMoney(line.product.price)} un.</small>
                </span>
                <span className="flex items-center gap-1">
                  <Button size="sm" aria-label={`Tirar um ${line.product.name}`} disabled={line.quantity <= 1}
                    onClick={() => changeQuantity(line.sku, -1)}>
                    <Minus size={13} aria-hidden />
                  </Button>
                  <span className="w-7 text-center tabular-nums" aria-label="Quantidade">{line.quantity}</span>
                  <Button size="sm" aria-label={`Mais um ${line.product.name}`} onClick={() => changeQuantity(line.sku, 1)}>
                    <Plus size={13} aria-hidden />
                  </Button>
                </span>
                <b className="w-24 text-right font-semibold tabular-nums max-[520px]:ml-auto">{formatMoney(line.product.price * line.quantity)}</b>
                <button
                  className="grid size-7 place-items-center rounded-md text-faint hover:bg-subtle hover:text-danger"
                  aria-label={`Remover ${line.product.name}`}
                  onClick={() => removeFromCart(line.sku)}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-[18px]">
            <CardTitle>Pagamento</CardTitle>
            <div className="flex gap-2" role="radiogroup" aria-label="Forma de pagamento">
              {PAGAMENTOS.map((p) => (
                <label key={p.code} className={opcaoBase + (payment === p.code ? opcaoAtiva : opcaoInativa)}>
                  <input type="radio" name="pagamento" value={p.code} checked={payment === p.code}
                    onChange={() => setPayment(p.code)} className="sr-only" />
                  <span className="font-medium">{p.label}</span>
                  <small className="text-xs text-muted">{p.detail}</small>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-[18px]">
            <CardTitle>Usar pontos</CardTitle>
            {maxRedeem === 0 ? (
              <p className={hintClass}>
                {account.points < POINTS_PER_BLOCK
                  ? `Você tem ${formatNumber(account.points)} pts. Com ${POINTS_PER_BLOCK} pts já dá R$ 5,00 de desconto.`
                  : "O valor do carrinho ainda é baixo para usar pontos."}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Button size="sm" aria-label="Usar menos pontos" disabled={pointsUsed === 0}
                    onClick={() => setPointsToRedeem(Math.max(0, pointsUsed - POINTS_PER_BLOCK))}>
                    <Minus size={13} aria-hidden />
                  </Button>
                  <span className="text-center text-[13.5px]">
                    <b className="block text-lg font-semibold tabular-nums">{formatNumber(pointsUsed)} pts</b>
                    <small className="text-muted">− {formatMoney(pointsToMoney(pointsUsed))}</small>
                  </span>
                  <Button size="sm" aria-label="Usar mais pontos" disabled={pointsUsed >= maxRedeem}
                    onClick={() => setPointsToRedeem(Math.min(maxRedeem, pointsUsed + POINTS_PER_BLOCK))}>
                    <Plus size={13} aria-hidden />
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs text-faint">
                  Saldo {formatNumber(account.points)} pts · até {formatNumber(maxRedeem)} pts nesta compra
                </p>
              </>
            )}
          </Card>

          <Card className="p-[18px]">
            <dl className="flex flex-col gap-1.5 text-[13.5px]">
              <Linha rotulo="Subtotal" valor={formatMoney(subtotal)} />
              {discount > 0 && <Linha rotulo="Desconto com pontos" valor={`− ${formatMoney(discount)}`} />}
              <Linha rotulo="Total" valor={formatMoney(total)} forte />
              <Linha rotulo="Você vai ganhar" valor={`+${formatNumber(points)} pts`} />
            </dl>
            {error && <p className={`${errorClass} mt-3`} role="alert">{error}</p>}
            <Button variant="dark" className="mt-4 w-full py-2.5" disabled={sending || lines.length === 0} onClick={finalizar}>
              {sending ? "Finalizando..." : `Finalizar compra · ${formatMoney(total)}`}
            </Button>
          </Card>
        </div>
      </section>

      {confirmacao}
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between ${forte ? "border-t border-line pt-2 text-base font-semibold text-ink" : "text-muted"}`}>
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}

export default Checkout;
