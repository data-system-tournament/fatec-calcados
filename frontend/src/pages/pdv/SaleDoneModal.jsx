import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import { formatMoney, formatNumber, plural } from "../../utils/format";

function SaleDoneModal({ sale, online, onClose }) {
  const footer = <button className="btn dark" autoFocus onClick={onClose}>Nova venda</button>;

  return (
    <Modal title="Venda finalizada" onClose={onClose} footer={footer}>
      <div className="receipt">
        <span className="receipt-ok"><Icon name="check" size={22} /></span>
        <strong>{formatMoney(sale.total)}</strong>
        <span>
          {sale.itemCount} {plural(sale.itemCount, "item", "itens")} · {sale.payment} · {sale.time}
        </span>

        {sale.clientName
          ? <span>{sale.clientName} ganhou {formatNumber(sale.points)} pontos</span>
          : <span>Venda sem CPF, nenhum ponto emitido</span>}

        {online
          ? <span className="ok-t">Enviada ao painel</span>
          : <span className="warn-t">Salva no caixa, sincroniza quando a internet voltar</span>}
      </div>
    </Modal>
  );
}

export default SaleDoneModal;
