import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import { SITUACOES } from "../../components/ui/situacaoDoEstoque";
import { errorClass, fieldLabelClass, hintClass, inputClass } from "../../components/ui/styles";
import { useToast } from "../../contexts/toast";
import { useCarregar } from "../../hooks/useCarregar";
import { errorMessage, fetchStock, updateStock } from "../../services/api";
import type { StockItem, StockStatus } from "../../types";
import { formatNumber, plural } from "../../utils/format";

// Tela enxuta: a cor só aparece onde há algo a fazer. Um ponto marca a situação, e só os números
// "Acabando" e "Esgotado" ganham cor na grade; o que está em dia fica neutro.
const PONTO: Record<StockStatus, string> = {
  OK: "bg-ok",
  ACABANDO: "bg-accent",
  ESGOTADO: "bg-danger",
};
const TEXTO: Record<StockStatus, string> = {
  OK: "text-ink",
  ACABANDO: "text-accent-ink",
  ESGOTADO: "text-danger",
};

const filtroBase = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors ";
const filtroAtivo = `${filtroBase} bg-subtle font-medium text-ink`;
const filtroInativo = `${filtroBase} text-muted hover:text-ink`;

// O que está sendo contado: um produto sem numeração, ou uma numeração de um calçado.
type Ajuste = { item: StockItem; size: number | null };

// Feito com IA: estoque para o gerente saber o que repor. Cada venda (caixa ou loja online) já tira do estoque
// no backend; aqui ele vê a situação de cada produto, com esgotados e acabando no topo, e acerta a contagem
// depois de receber mercadoria ou contar a prateleira. Os filtros no topo também são o resumo (a contagem de
// cada situação vem do backend sobre todos os produtos) e ficam na URL (/admin/estoque?situacao=ACABANDO).
// Calçado mostra a grade de números; clicar num número abre a contagem só dele.
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
  const filtros: { valor: string; rotulo: string; total: number; situacao?: StockStatus }[] = [
    { valor: "", rotulo: "Todos", total: summary.products },
    { valor: "ESGOTADO", rotulo: "Esgotados", total: summary.outOfStock, situacao: "ESGOTADO" },
    { valor: "ACABANDO", rotulo: "Acabando", total: summary.runningLow, situacao: "ACABANDO" },
    { valor: "OK", rotulo: "Em dia", total: summary.products - summary.outOfStock - summary.runningLow, situacao: "OK" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorState title="Não foi possível atualizar a lista" message={error} onRetry={retry} />}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por situação">
          {filtros.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={status === f.valor}
              onClick={() => setStatus(f.valor)}
              className={status === f.valor ? filtroAtivo : filtroInativo}
            >
              {f.situacao && <span className={`size-1.5 rounded-full ${PONTO[f.situacao]}`} aria-hidden="true" />}
              {f.rotulo}
              <span className="text-muted tabular-nums">{formatNumber(f.total)}</span>
            </button>
          ))}
        </div>
        <small className="text-[12.5px] text-muted tabular-nums">
          {formatNumber(summary.units)} {plural(summary.units, "unidade", "unidades")} em estoque
        </small>
      </div>

      <Card className={`px-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        {data.items.length === 0 ? (
          <p className={`${hintClass} py-4`}>{status ? "Nenhum produto nessa situação." : "Nenhum produto ativo no catálogo."}</p>
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
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={`size-2 flex-none rounded-full ${PONTO[item.status]}`} aria-hidden="true" />
            <b className="truncate text-[14px] font-semibold">{item.name}</b>
            {item.status !== "OK" && (
              <span className={`flex-none text-[12px] font-medium ${TEXTO[item.status]}`}>{SITUACOES[item.status].rotulo}</span>
            )}
            {item.status === "OK" && <span className="sr-only">{SITUACOES.OK.rotulo}</span>}
          </span>
          <small className="mt-0.5 block pl-4 text-[12px] text-muted tabular-nums">
            {item.sku} · {formatNumber(item.sold)} {plural(item.sold, "vendido", "vendidos")} em {soldDays} dias · mín. {formatNumber(item.minimum)}
            {item.usesSizes && " por número"}
          </small>
        </div>
        {item.usesSizes ? (
          <span className="flex-none text-right text-[13px] text-muted tabular-nums">
            <b className="text-[16px] font-semibold text-ink">{formatNumber(item.quantity)}</b> {plural(item.quantity, "par", "pares")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onAjustar(null)}
            aria-label={`${item.name}: ${item.quantity} em estoque. Ajustar`}
            className="flex-none rounded-md px-2 py-1 text-right text-[13px] text-muted tabular-nums transition-colors hover:bg-subtle"
          >
            <b className={`text-[16px] font-semibold ${TEXTO[item.status]}`}>{formatNumber(item.quantity)}</b>{" "}
            {plural(item.quantity, "unidade", "unidades")}
          </button>
        )}
      </div>

      {item.usesSizes && (
        <ul className="flex flex-wrap gap-1 pl-4" aria-label={`Numerações de ${item.name}`}>
          {item.sizes.map((s) => (
            <li key={s.size}>
              <button
                type="button"
                onClick={() => onAjustar(s.size)}
                title="Ajustar a contagem"
                aria-label={`${item.name} número ${s.size}: ${s.quantity} em estoque, ${SITUACOES[s.status].rotulo}. Ajustar`}
                className="flex w-11 flex-col items-center rounded-md border border-line py-1 transition-colors hover:border-line-2 hover:bg-subtle"
              >
                <small className="text-[10.5px] text-muted tabular-nums">{s.size}</small>
                <b className={`text-[14px] leading-tight font-semibold tabular-nums ${TEXTO[s.status]}`}>{s.quantity}</b>
              </button>
            </li>
          ))}
        </ul>
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
