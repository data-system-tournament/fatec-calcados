import { Boxes, PackageCheck, PackageX, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import {
  colunaSecundaria, errorClass, fieldLabelClass, hintClass, inputClass, quebraNoCelular, tdClass, thClass,
} from "../../components/ui/styles";
import { useToast } from "../../contexts/toast";
import { useCarregar } from "../../hooks/useCarregar";
import { errorMessage, fetchStock, updateStock } from "../../services/api";
import type { StockItem, StockStatus } from "../../types";
import { formatNumber, plural } from "../../utils/format";
import { Indicador } from "../conta/pecas";

const selectClass = `${inputClass} py-[5px] text-[12.5px]`;

// Cores fixas das situações: vermelho = esgotado, âmbar = acabando, verde = em dia (como no dashboard).
const SITUACOES: Record<StockStatus, { rotulo: string; classe: string }> = {
  ESGOTADO: { rotulo: "Esgotado", classe: "bg-danger-soft text-danger" },
  ACABANDO: { rotulo: "Acabando", classe: "bg-accent-soft text-accent-ink" },
  OK: { rotulo: "Em dia", classe: "bg-ok-soft text-ok" },
};

// Feito com IA: estoque para o gerente saber o que repor. Cada venda (caixa ou loja online) já tira do
// estoque no backend; aqui ele vê a situação de cada produto, com esgotados e acabando no topo, e acerta a
// contagem depois de receber mercadoria ou contar a prateleira. O filtro de situação fica na URL
// (/admin/estoque?situacao=ACABANDO), como nas outras listas.
function Estoque() {
  const [params, setParams] = useSearchParams();
  const status = params.get("situacao") ?? "";
  const [editing, setEditing] = useState<StockItem | null>(null);

  const { data, error, loading, retry } = useCarregar(() => fetchStock(status), status);

  function setStatus(value: string) {
    setParams(value ? { situacao: value } : {});
  }

  if (!data) {
    return error ? (
      <ErrorState title="Não foi possível carregar o estoque" message={error} onRetry={retry} />
    ) : (
      <p className={hintClass} role="status">Carregando o estoque...</p>
    );
  }

  const { summary } = data;

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorState title="Não foi possível atualizar a lista" message={error} onRetry={retry} />}

      <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
        <Indicador tom="ciano" icone={<Boxes size={16} />} rotulo="Produtos"
          valor={formatNumber(summary.products)} detalhe={`${formatNumber(summary.units)} ${plural(summary.units, "unidade", "unidades")} em estoque`} />
        <Indicador tom="verde" icone={<PackageCheck size={16} />} rotulo="Em dia"
          valor={formatNumber(summary.products - summary.outOfStock - summary.runningLow)} detalhe="acima do mínimo" />
        <Indicador tom="ambar" icone={<TriangleAlert size={16} />} rotulo="Acabando"
          valor={formatNumber(summary.runningLow)} detalhe="no mínimo ou abaixo: repor logo" />
        <Indicador tom="vermelho" icone={<PackageX size={16} />} rotulo="Esgotados"
          valor={formatNumber(summary.outOfStock)} detalhe="sem nenhuma unidade" />
      </div>

      <Card className={`p-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5">
          <CardTitle>Produtos</CardTitle>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex flex-col gap-[3px] text-xs text-muted">
              Situação
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todas</option>
                <option value="ESGOTADO">Esgotados</option>
                <option value="ACABANDO">Acabando</option>
                <option value="OK">Em dia</option>
              </select>
            </label>
          </div>
        </div>

        {data.items.length === 0 ? (
          <p className={hintClass}>{status ? "Nenhum produto nessa situação." : "Nenhum produto ativo no catálogo."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={`${thClass} text-left`}>Produto</th>
                  <th className={`${thClass} text-left`}>Situação</th>
                  <th className={`${thClass} text-right`}>Em estoque</th>
                  <th className={`${thClass} ${colunaSecundaria} text-right`}>Mínimo</th>
                  <th className={`${thClass} ${colunaSecundaria} text-right`}>Vendidos ({data.soldDays} dias)</th>
                  <th className={thClass}><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {data.items.map((item) => (
                  <tr key={item.sku} className="hover:bg-subtle">
                    <td className={`${tdClass} ${quebraNoCelular}`}>
                      <span className="font-medium">{item.name}</span>
                      <small className="block text-[11.5px] text-muted">{item.sku}</small>
                    </td>
                    <td className={tdClass}>
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${SITUACOES[item.status].classe}`}>
                        {SITUACOES[item.status].rotulo}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatNumber(item.quantity)}</td>
                    <td className={`${tdClass} ${colunaSecundaria} text-right tabular-nums text-muted`}>{formatNumber(item.minimum)}</td>
                    <td className={`${tdClass} ${colunaSecundaria} text-right tabular-nums text-muted`}>{formatNumber(item.sold)}</td>
                    <td className={`${tdClass} text-right`}>
                      <Button size="sm" onClick={() => setEditing(item)} aria-label={`Ajustar o estoque de ${item.name}`}>
                        Ajustar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <AjusteModal item={editing} soldDays={data.soldDays} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); retry(); }} />
      )}
    </div>
  );
}

// Contagem do produto: quanto há na prateleira agora e o mínimo a partir do qual ele entra em "Acabando".
function AjusteModal({ item, soldDays, onClose, onSaved }: {
  item: StockItem;
  soldDays: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const notify = useToast();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [minimum, setMinimum] = useState(String(item.minimum));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateStock(item.sku, Number(quantity), Number(minimum));
      notify(`Estoque de ${item.name} atualizado`);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="dark" type="submit" form="ajuste-estoque" disabled={saving || quantity === "" || minimum === ""}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </>
  );

  return (
    <Modal title={`Estoque · ${item.name}`} onClose={onClose} footer={footer}>
      <form id="ajuste-estoque" onSubmit={handleSubmit}>
        <label className={fieldLabelClass}>
          Quantidade em estoque
          <input className={inputClass} type="number" min={0} step={1} inputMode="numeric" required autoFocus
            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Estoque mínimo
          <input className={inputClass} type="number" min={0} step={1} inputMode="numeric" required
            value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </label>
        <p className="m-0 text-[12.5px] text-muted">
          Com o mínimo ou menos, o produto aparece como "Acabando". Vendidos nos últimos {soldDays} dias:{" "}
          <strong className="text-ink">{formatNumber(item.sold)}</strong>.
        </p>
        {error && <p className={`${errorClass} mt-2`} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default Estoque;
