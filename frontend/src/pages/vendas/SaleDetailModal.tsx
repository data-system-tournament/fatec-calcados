import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { hintClass, tdClass, thClass } from "../../components/ui/styles";
import { paymentLabel } from "../../config";
import { useCarregar } from "../../hooks/useCarregar";
import { fetchSaleDetail } from "../../services/api";
import type { SaleDetail } from "../../types";
import { formatDateTime, formatMoney, formatNumber } from "../../utils/format";

type SaleDetailModalProps = {
  saleId: string;
  onClose: () => void;
};

// Detalhe de uma venda (itens, desconto e pontos). Usada nas telas de Vendas e do perfil do cliente.
function SaleDetailModal({ saleId, onClose }: SaleDetailModalProps) {
  const { data, error, retry } = useCarregar(() => fetchSaleDetail(saleId), saleId);

  const footer = <Button onClick={onClose}>Fechar</Button>;

  return (
    <Modal title={data ? `Venda de ${formatDateTime(data.date)}` : "Venda"} onClose={onClose} footer={footer}>
      {!data && !error && <p className={hintClass} role="status">Carregando a venda...</p>}
      {!data && error && (
        <p className={hintClass} role="alert">
          {error} <button className="font-medium underline underline-offset-[3px]" onClick={retry}>Tentar de novo</button>
        </p>
      )}
      {data && <Detail sale={data} />}
    </Modal>
  );
}

function Detail({ sale }: { sale: SaleDetail }) {
  return (
    <div className="text-[13px]">
      <p className="mb-3 text-muted">
        {sale.store}{sale.register && ` · ${sale.register}`} · {paymentLabel(sale.payment)}
        <br />
        {sale.client
          ? <>Cliente: <Link to={`/clientes/${sale.client.id}`} className="font-medium text-ink underline underline-offset-[3px]">{sale.client.name}</Link>
              {sale.levelAtPurchase && ` (${sale.levelAtPurchase} na compra)`}</>
          : "Venda sem CPF, nenhum ponto emitido"}
      </p>

      <div className="max-h-56 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${thClass} text-left`}>Item</th>
              <th className={`${thClass} text-right`}>Qtd</th>
              <th className={`${thClass} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.sku}>
                <td className={`${tdClass} whitespace-normal`}>
                  {item.name}<small className="block text-xs text-faint">{formatMoney(item.unitPrice)} un.</small>
                </td>
                <td className={`${tdClass} text-right`}>{item.quantity}</td>
                <td className={`${tdClass} text-right`}>{formatMoney(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-3 flex flex-col gap-1">
        <Line label="Subtotal" value={formatMoney(sale.gross)} />
        {sale.pointsRedeemed > 0 && (
          <Line label={`Pontos usados (${formatNumber(sale.pointsRedeemed)} pts)`} value={`− ${formatMoney(sale.discount)}`} />
        )}
        <Line label="Total pago" value={formatMoney(sale.paid)} strong />
        {sale.client && <Line label="Pontos ganhos" value={`+${formatNumber(sale.pointsEarned)} pts`} />}
      </dl>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-sm font-semibold text-ink" : "text-muted"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default SaleDetailModal;
