import { Check } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { paymentLabel } from "../../config";
import type { Sale } from "../../types";
import { formatMoney, formatNumber, plural } from "../../utils/format";

function SaleDoneModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const footer = <Button variant="dark" autoFocus onClick={onClose}>Nova venda</Button>;

  return (
    <Modal title="Venda finalizada" onClose={onClose} footer={footer}>
      <div className="flex flex-col items-center gap-1 py-2 text-center text-[13px] text-muted">
        <span className="mb-2 grid size-11 place-items-center rounded-full bg-ok-soft text-ok"><Check size={22} /></span>
        <strong className="text-[32px] font-semibold tracking-[-.03em] text-ink">{formatMoney(sale.total)}</strong>
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
          ? <span className="mt-2 font-medium text-ok">Enviada ao painel</span>
          : <span className="mt-2 font-medium text-accent-ink">Salva no caixa, sincroniza quando a internet voltar</span>}
      </div>
    </Modal>
  );
}

export default SaleDoneModal;
