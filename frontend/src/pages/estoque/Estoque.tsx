import { Boxes, PackageCheck, PackageX, Pencil, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import { SITUACOES } from "../../components/ui/situacaoDoEstoque";
import { errorClass, fieldLabelClass, hintClass, inputClass } from "../../components/ui/styles";
import { useToast } from "../../contexts/toast";
import { useCarregar } from "../../hooks/useCarregar";
import { errorMessage, fetchStock, updateStock } from "../../services/api";
import type { StockItem, StockStatus } from "../../types";
import { formatNumber, plural } from "../../utils/format";
import { Indicador } from "../conta/pecas";

const selectClass = `${inputClass} py-[5px] text-[12.5px]`;

// O que cada cor quer dizer, escrito na tela (a legenda fica acima da lista).
const LEGENDA: { status: StockStatus; texto: string }[] = [
  { status: "OK", texto: "acima do mínimo" },
  { status: "ACABANDO", texto: "no mínimo ou abaixo: repor logo" },
  { status: "ESGOTADO", texto: "zerado" },
];

// O que está sendo contado: um produto sem numeração, ou uma numeração de um calçado.
type Ajuste = { item: StockItem; size: number | null };

// Feito com IA: estoque para o gerente saber o que repor. Cada venda (caixa ou loja online) já tira do estoque
// no backend; aqui ele vê a situação de cada produto, com esgotados e acabando no topo, e acerta a contagem
// depois de receber mercadoria ou contar a prateleira. Calçado tem estoque por numeração: cada produto mostra
// a grade de números, cada um pintado pela situação (verde, âmbar, vermelho, como na legenda), e clicar num
// número abre a contagem só dele. O filtro de situação fica na URL (/admin/estoque?situacao=ACABANDO).
function Estoque() {
  const [params, setParams] = useSearchParams();
  const status = params.get("situacao") ?? "";
  const [ajuste, setAjuste] = useState<Ajuste | null>(null);

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
          valor={formatNumber(summary.products - summary.outOfStock - summary.runningLow)} detalhe="todos os números acima do mínimo" />
        <Indicador tom="ambar" icone={<TriangleAlert size={16} />} rotulo="Acabando"
          valor={formatNumber(summary.runningLow)}
          detalhe={`${formatNumber(summary.sizesOut)} ${plural(summary.sizesOut, "número zerado", "números zerados")} nos calçados`} />
        <Indicador tom="vermelho" icone={<PackageX size={16} />} rotulo="Esgotados"
          valor={formatNumber(summary.outOfStock)} detalhe="sem nenhuma unidade" />
      </div>

      <Card className={`p-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <CardTitle>Produtos</CardTitle>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted" aria-label="O que cada cor quer dizer">
              {LEGENDA.map((l) => (
                <li key={l.status} className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SITUACOES[l.status].selo}`}>
                    {SITUACOES[l.status].rotulo}
                  </span>
                  {l.texto}
                </li>
              ))}
            </ul>
          </div>
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

        {data.items.length === 0 ? (
          <p className={hintClass}>{status ? "Nenhum produto nessa situação." : "Nenhum produto ativo no catálogo."}</p>
        ) : (
          <ul className="flex flex-col">
            {data.items.map((item) => (
              <LinhaDoProduto key={item.sku} item={item} soldDays={data.soldDays} onAjustar={(size) => setAjuste({ item, size })} />
            ))}
          </ul>
        )}
      </Card>

      {ajuste && (
        <AjusteModal
          ajuste={ajuste}
          soldDays={data.soldDays}
          onClose={() => setAjuste(null)}
          onSaved={() => {
            setAjuste(null);
            retry();
          }}
        />
      )}
    </div>
  );
}

function LinhaDoProduto({ item, soldDays, onAjustar }: {
  item: StockItem;
  soldDays: number;
  onAjustar: (size: number | null) => void;
}) {
  const zerados = item.sizes.filter((s) => s.quantity === 0).length;

  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 first:pt-1 last:border-0 last:pb-1">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <b className="text-[14px] font-semibold">{item.name}</b>
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${SITUACOES[item.status].selo}`}>
              {SITUACOES[item.status].rotulo}
            </span>
          </span>
          <small className="mt-0.5 block text-[12px] text-muted">
            {item.sku} · vendidos em {soldDays} dias: <b className="font-medium text-ink-2 tabular-nums">{formatNumber(item.sold)}</b>
            {" · "}{item.usesSizes ? "mínimo por número" : "mínimo"}: <b className="font-medium text-ink-2 tabular-nums">{formatNumber(item.minimum)}</b>
          </small>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-right">
            <strong className="block text-[20px] leading-none font-semibold tabular-nums">{formatNumber(item.quantity)}</strong>
            <small className="text-[11.5px] text-muted">
              {item.usesSizes ? `${plural(item.quantity, "par", "pares")} no total` : plural(item.quantity, "unidade", "unidades")}
            </small>
          </span>
          {!item.usesSizes && (
            <Button size="sm" onClick={() => onAjustar(null)} aria-label={`Ajustar o estoque de ${item.name}`}>
              <Pencil size={13} aria-hidden /> Ajustar
            </Button>
          )}
        </div>
      </div>

      {item.usesSizes && (
        <div>
          <p className="mb-1.5 text-[12px] text-muted">
            Estoque por numeração{zerados > 0 && <> · <b className="font-medium text-danger">{zerados} {plural(zerados, "número zerado", "números zerados")}</b></>}
            {" "}· clique num número para ajustar a contagem
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1.5">
            {item.sizes.map((s) => (
              <li key={s.size}>
                <button
                  type="button"
                  onClick={() => onAjustar(s.size)}
                  aria-label={`${item.name} número ${s.size}: ${s.quantity} em estoque, ${SITUACOES[s.status].rotulo}. Ajustar`}
                  className={`flex w-full flex-col items-center rounded-lg border py-1.5 transition-shadow hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${SITUACOES[s.status].celula}`}
                >
                  <small className="text-[11px] font-medium text-ink-2 tabular-nums">nº {s.size}</small>
                  <b className="text-[16px] leading-tight font-semibold tabular-nums">{s.quantity}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

// Contagem de um produto sem numeração, ou de uma numeração do calçado: quanto há na prateleira agora e o
// mínimo a partir do qual entra em "Acabando" (no calçado, o mínimo vale para todos os números).
function AjusteModal({ ajuste, soldDays, onClose, onSaved }: {
  ajuste: Ajuste;
  soldDays: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { item, size } = ajuste;
  const notify = useToast();
  const atual = size === null ? item.quantity : item.sizes.find((s) => s.size === size)?.quantity ?? 0;
  const [quantity, setQuantity] = useState(String(atual));
  const [minimum, setMinimum] = useState(String(item.minimum));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nome = size === null ? item.name : `${item.name} nº ${size}`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateStock(item.sku, Number(quantity), Number(minimum), size);
      notify(`Estoque de ${nome} atualizado`);
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
    <Modal title={`Estoque · ${nome}`} onClose={onClose} footer={footer}>
      <form id="ajuste-estoque" onSubmit={handleSubmit}>
        <label className={fieldLabelClass}>
          {size === null ? "Quantidade em estoque" : `Pares do número ${size} em estoque`}
          <input className={inputClass} type="number" min={0} step={1} inputMode="numeric" required autoFocus
            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          {size === null ? "Estoque mínimo" : "Estoque mínimo por número (vale para todos)"}
          <input className={inputClass} type="number" min={0} step={1} inputMode="numeric" required
            value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </label>
        <p className="m-0 text-[12.5px] text-muted">
          Com o mínimo ou menos, {size === null ? "o produto" : "o número"} aparece como "Acabando". Vendidos nos
          últimos {soldDays} dias ({size === null ? "o produto" : "todos os números"}):{" "}
          <strong className="text-ink">{formatNumber(item.sold)}</strong>.
        </p>
        {error && <p className={`${errorClass} mt-2`} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default Estoque;
