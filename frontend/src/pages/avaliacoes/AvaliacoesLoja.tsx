import { Coins, MessageSquareText, Star, ThumbsDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Estrelas } from "../../components/ui/Estrelas";
import { Pagination } from "../../components/ui/Pagination";
import { hintClass, inputClass, tdClass, thClass } from "../../components/ui/styles";
import { useCarregar } from "../../hooks/useCarregar";
import { fetchStoreReviews } from "../../services/api";
import type { StoreReviews } from "../../types";
import { formatDay, formatNumber, formatPercent, plural } from "../../utils/format";
import { Indicador } from "../conta/pecas";

const selectClass = `${inputClass} py-[5px] text-[12.5px]`;

// Feito com IA: avaliações dos clientes para o gerente. Em cima o retrato do catálogo inteiro (quantas,
// nota média, pontos dados, notas baixas, nota por produto e distribuição); embaixo os comentários, com
// filtros de produto e nota na URL (/admin/avaliacoes?produto=7890001&nota=2), como na tela de Vendas.
// Clicar num produto da tabela filtra os comentários por ele.
function AvaliacoesLoja() {
  const [params, setParams] = useSearchParams();
  const product = params.get("produto") ?? "";
  const rating = params.get("nota") ?? "";
  const page = Number(params.get("pagina")) || 1;

  const { data, error, loading, retry } = useCarregar(
    () => fetchStoreReviews({ product, rating, page }),
    [product, rating, page].join("|"),
  );

  // Trocar um filtro volta para a primeira página.
  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("pagina");
    setParams(next);
  }

  function setPage(value: number) {
    const next = new URLSearchParams(params);
    next.set("pagina", String(value));
    setParams(next);
  }

  if (!data) {
    return error ? (
      <ErrorState title="Não foi possível carregar as avaliações" message={error} onRetry={retry} />
    ) : (
      <p className={hintClass} role="status">Carregando as avaliações...</p>
    );
  }

  if (data.summary.total === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <MessageSquareText size={28} className="text-faint" aria-hidden />
        <p className={hintClass}>Nenhum cliente avaliou um produto ainda. As avaliações aparecem aqui assim que chegarem.</p>
      </Card>
    );
  }

  const baixas = data.byRating.filter((n) => n.rating <= 2).reduce((total, n) => total + n.count, 0);

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorState title="Não foi possível atualizar a lista" message={error} onRetry={retry} />}

      <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
        <Indicador tom="laranja" icone={<MessageSquareText size={16} />} rotulo="Avaliações"
          valor={formatNumber(data.summary.total)} detalhe={`de ${formatNumber(data.byProduct.length)} ${plural(data.byProduct.length, "produto", "produtos")}`} />
        <Indicador tom="ambar" icone={<Star size={16} />} rotulo="Nota média"
          valor={data.summary.average === null ? "—" : `${formatPercent(data.summary.average)} de 5`} detalhe="todas as avaliações" />
        <Indicador tom="azul" icone={<Coins size={16} />} rotulo="Pontos dados"
          valor={`${formatNumber(data.summary.points)} pts`} detalhe="por avaliar produtos" />
        <Indicador tom="vermelho" icone={<ThumbsDown size={16} />} rotulo="Notas baixas (1 e 2)"
          valor={formatNumber(baixas)} detalhe="vale ler os comentários" />
      </div>

      <section className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 max-[1000px]:grid-cols-[minmax(0,1fr)]">
        <PorProduto data={data} produtoAtivo={product} onFiltrar={(sku) => setFilter("produto", sku === product ? "" : sku)} />
        <Distribuicao data={data} />
      </section>

      <Card className={`p-[18px] transition-opacity duration-150 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5">
          <CardTitle>Comentários</CardTitle>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex flex-col gap-[3px] text-xs text-muted">
              Produto
              <select className={selectClass} value={product} onChange={(e) => setFilter("produto", e.target.value)}>
                <option value="">Todos</option>
                {data.byProduct.map((p) => <option key={p.sku} value={p.sku}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-[3px] text-xs text-muted">
              Nota
              <select className={selectClass} value={rating} onChange={(e) => setFilter("nota", e.target.value)}>
                <option value="">Todas</option>
                {data.byRating.map((n) => (
                  <option key={n.rating} value={n.rating}>{n.rating} {plural(n.rating, "estrela", "estrelas")}</option>
                ))}
              </select>
            </label>
            {(product || rating) && (
              <button className="pb-1.5 text-[12.5px] font-medium text-muted underline underline-offset-[3px] hover:text-ink" onClick={() => setParams({})}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {data.reviews.length === 0 ? (
          <p className={hintClass}>Nenhuma avaliação com esses filtros.</p>
        ) : (
          <ul className="flex flex-col">
            {data.reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-1 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <Estrelas nota={review.rating} tamanho={14} />
                  <span className="font-medium">{review.product.name}</span>
                  <span className="text-muted">
                    por{" "}
                    <Link to={`/admin/clientes/${review.client.id}`} className="font-medium text-ink underline-offset-[3px] hover:underline">
                      {review.client.name}
                    </Link>
                  </span>
                  <small className="ml-auto text-xs text-faint">{formatDay(review.date)}</small>
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}

        {data.pages > 1 && (
          <Pagination page={data.page} pages={data.pages} total={data.total} noun={["avaliação", "avaliações"]} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}

function PorProduto({ data, produtoAtivo, onFiltrar }: {
  data: StoreReviews;
  produtoAtivo: string;
  onFiltrar: (sku: string) => void;
}) {
  return (
    <Card className="p-[18px]">
      <CardTitle>Nota por produto</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={`${thClass} text-left`}>Produto</th>
              <th className={`${thClass} text-right`}>Avaliações</th>
              <th className={`${thClass} text-right`}>Média</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {data.byProduct.map((p) => (
              <tr key={p.sku} className={p.sku === produtoAtivo ? "bg-subtle" : "hover:bg-subtle"}>
                <td className={tdClass}>
                  <button
                    type="button"
                    onClick={() => onFiltrar(p.sku)}
                    aria-pressed={p.sku === produtoAtivo}
                    title="Ver só os comentários deste produto"
                    className="font-medium underline-offset-[3px] hover:underline"
                  >
                    {p.name}
                  </button>
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(p.count)}</td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-flex items-center gap-2">
                    <Estrelas nota={Math.round(p.average)} tamanho={13} />
                    <span className="w-7 tabular-nums">{formatPercent(p.average)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Uma barra por nota (5 a 1), proporcional ao total de avaliações.
function Distribuicao({ data }: { data: StoreReviews }) {
  return (
    <Card className="p-[18px]">
      <CardTitle>Distribuição das notas</CardTitle>
      <ul className="flex flex-col gap-2.5">
        {data.byRating.map((n) => {
          const percentual = data.summary.total ? (100 * n.count) / data.summary.total : 0;
          return (
            <li key={n.rating} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-1 text-muted">
                {n.rating} <Star size={13} className="fill-current text-accent" aria-hidden />
                <span className="sr-only">{plural(n.rating, "estrela", "estrelas")}</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
                <span className="block h-full rounded-full bg-accent" style={{ width: `${percentual}%` }} />
              </span>
              <span className="text-right tabular-nums">{formatNumber(n.count)}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default AvaliacoesLoja;
