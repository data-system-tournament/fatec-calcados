import { Check } from "lucide-react";
import Modal from "../../components/Modal";
import { paymentLabel } from "../../config";
import { formatMoney, formatNumber, plural } from "../../utils/format";

function SaleDoneModal({ sale, onClose }) {
  const footer = <button className="btn dark" autoFocus onClick={onClose}>Nova venda</button>;

  return (
    <Modal title="Venda finalizada" onClose={onClose} footer={footer}>
      <div className="receipt">
        <span className="receipt-ok"><Check size={22} /></span>
        <strong>{formatMoney(sale.total)}</strong>
        <span>
          {sale.itemCount} {plural(sale.itemCount, "item", "itens")} · {paymentLabel(sale.payment)} · {sale.time}
        </span>

        {!sale.clientName && <span>Venda sem CPF, nenhum ponto emitido</span>}
        {sale.clientName && sale.synced && (
          <span>{sale.clientName} ganhou {formatNumber(sale.points)} pontos</span>
        )}
        {sale.clientName && !sale.synced && (
          <span>Os pontos de {sale.clientName} entram quando a venda sincronizar</span>
        )}

        {sale.synced
          ? <span className="ok-t">Enviada ao painel</span>
          : <span className="warn-t">Salva no caixa, sincroniza quando a internet voltar</span>}
      </div>
    </Modal>
  );
}

export default SaleDoneModal;
