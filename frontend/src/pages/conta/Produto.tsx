import { ChevronRight, Coins, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Abas } from "../../components/ui/Abas";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Estrelas } from "../../components/ui/Estrelas";
import { hintClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { disponivel } from "../../hooks/useCarrinhoOnline";
import { useCarregar } from "../../hooks/useCarregar";
import { estimatePoints } from "../../regras";
import { fetchProductDetail } from "../../services/api";
import type { Product, ProductDetail } from "../../types";
import { unidadesPorProduto } from "../../utils/carrinho";
import { formatDay, formatMoney, formatNumber, plural } from "../../utils/format";
import { categoriaDoProduto } from "../pdv/categorias";
import CardProduto from "./CardProduto";
import { FotoDoProduto } from "./pecas";

// Feito com IA: página do produto na loja online (/loja/produto/<sku>), no formato das lojas de e-commerce:
// foto grande, e ao lado categoria, nome, nota das avaliações, preço, pontos que rende, a escolha da
// numeração (já com o número do perfil marcado), quanto há em estoque, quantidade e "Adicionar ao carrinho".
// Embaixo, as abas Descrição e Avaliações (as reais, que os clientes deixam em Minha conta) e "Você também
// pode gostar", com os produtos da mesma categoria. Uma foto só: o produto não tem outras, então não há
// miniaturas inventadas.
function Produto() {
  const { sku = "" } = useParams();
  const { data, error, retry } = useCarregar(() => fetchProductDetail(sku), sku);

  if (!data || data.sku !== sku) {
    return error ? (
      <ErrorState title="Não foi possível abrir o produto" message={error} onRetry={retry} />
    ) : (
      <p className={hintClass} role="status">Carregando o produto...</p>
    );
  }
  // A key zera a numeração e a quantidade escolhidas ao ir para outro produto (ex.: "Você também pode gostar").
  return <PaginaDoProduto key={data.sku} produto={data} />;
}

type AbaDoProduto = "descricao" | "avaliacoes";

// Mais que o mínimo do estoque: não vale a pena alarmar o cliente; até ele, "Últimas N".
const POUCAS_UNIDADES = 3;

function PaginaDoProduto({ produto }: { produto: ProductDetail }) {
  const { account, products, cart, addToCart } = useConta();
  const notify = useToast();
  const numeroDoCliente = account?.shoeSize ?? null;
  const categoria = categoriaDoProduto(produto.name);

  const numeroInicial = produto.usesSizes && numeroDoCliente !== null && disponivel(produto, numeroDoCliente) > 0
    ? numeroDoCliente
    : null;
  const [numero, setNumero] = useState<number | null>(numeroInicial);
  const [quantidade, setQuantidade] = useState(1);
  const [aba, setAba] = useState<AbaDoProduto>("descricao");

  // Quanto ainda dá para pôr no carrinho: o estoque do número escolhido menos o que já está lá.
  const escolhido = produto.usesSizes ? numero : null;
  const noCarrinho = cart.find((item) => item.sku === produto.sku && item.size === escolhido)?.quantity ?? 0;
  const estoque = produto.usesSizes && numero === null ? 0 : disponivel(produto, escolhido);
  const livre = Math.max(0, estoque - noCarrinho);
  const podeAdicionar = (!produto.usesSizes || numero !== null) && livre > 0;
  const pontos = estimatePoints(produto.price * quantidade, account?.bonusPercent ?? 0);

  function adicionar() {
    if (!podeAdicionar) return;
    const qtd = Math.min(quantidade, livre);
    addToCart(produto.sku, escolhido, qtd);
    notify(`${qtd}× ${produto.name}${escolhido !== null ? ` nº ${escolhido}` : ""} no carrinho`);
    setQuantidade(1);
  }

  function escolherNumero(valor: number) {
    setNumero(valor);
    setQuantidade(1);
  }

  const relacionados = products
    .filter((p) => p.sku !== produto.sku && categoriaDoProduto(p.name) === categoria)
    .slice(0, 4);
  const quantidades = unidadesPorProduto(cart);

  // Largura máxima: em tela grande a foto (quadrada) passaria da altura da tela.
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8">
      <nav aria-label="Você está em" className="flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
        <Link to="/loja" className="hover:text-ink hover:underline">Loja</Link>
        <ChevronRight size={13} aria-hidden />
        <span>{categoria}</span>
        <ChevronRight size={13} aria-hidden />
        <span className="text-ink" aria-current="page">{produto.name}</span>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 max-[860px]:grid-cols-1">
        <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-line bg-foto">
          <FotoDoProduto nome={produto.name} foto={produto.photo} tamanhoIcone={96} />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <small className="text-[11.5px] font-semibold tracking-[.08em] text-muted uppercase">{categoria}</small>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-.02em]">{produto.name}</h1>
            {produto.rating !== null ? (
              <button
                type="button"
                onClick={() => {
                  setAba("avaliacoes");
                  document.getElementById("produto-abas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"
              >
                <Estrelas nota={Math.round(produto.rating)} tamanho={15} />
                <span className="font-medium tabular-nums">
                  {produto.rating.toFixed(1).replace(".", ",")} · {produto.reviewCount} {plural(produto.reviewCount, "avaliação", "avaliações")}
                </span>
              </button>
            ) : (
              <p className="mt-1.5 text-[13px] text-muted">Ainda sem avaliações</p>
            )}
          </div>

          <div>
            <strong className="block text-[30px] leading-none font-semibold tracking-[-.02em] tabular-nums">
              {formatMoney(produto.price)}
            </strong>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-app">
              <Coins size={15} aria-hidden /> Rende +{formatNumber(pontos)} pts no seu nível
            </span>
          </div>

          {produto.usesSizes && (
            <EscolherNumero produto={produto} numero={numero} numeroDoCliente={numeroDoCliente} onChange={escolherNumero} />
          )}

          <Disponibilidade produto={produto} numero={numero} numeroDoCliente={numeroDoCliente} estoque={estoque} />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-line-2 bg-surface p-0.5" role="group" aria-label="Quantidade">
              <button
                type="button"
                aria-label="Tirar um"
                disabled={quantidade <= 1}
                onClick={() => setQuantidade((q) => q - 1)}
                className="grid size-9 place-items-center rounded-md text-muted enabled:hover:bg-subtle enabled:hover:text-ink disabled:opacity-30"
              >
                <Minus size={15} aria-hidden />
              </button>
              <b className="min-w-9 text-center tabular-nums" aria-live="polite">{quantidade}</b>
              <button
                type="button"
                aria-label="Mais um"
                disabled={quantidade >= livre}
                onClick={() => setQuantidade((q) => q + 1)}
                className="grid size-9 place-items-center rounded-md text-muted enabled:hover:bg-subtle enabled:hover:text-ink disabled:opacity-30"
              >
                <Plus size={15} aria-hidden />
              </button>
            </div>
            <Button variant="dark" className="gap-2 px-5 py-2.5" disabled={!podeAdicionar} onClick={adicionar}>
              <ShoppingCart size={16} aria-hidden />
              {produto.usesSizes && numero === null ? "Escolha a numeração" : "Adicionar ao carrinho"}
            </Button>
          </div>
          {noCarrinho > 0 && (
            <p className="text-[13px] text-muted">
              Você já tem {noCarrinho} no carrinho.{" "}
              <Link to="/loja/carrinho" className="font-medium text-ink underline underline-offset-2">Ver carrinho</Link>
            </p>
          )}
        </div>
      </div>

      <div id="produto-abas" className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 max-[860px]:grid-cols-1">
        <div>
          <Abas
            abas={[
              { valor: "descricao", rotulo: "Descrição" },
              { valor: "avaliacoes", rotulo: `Avaliações (${produto.reviewCount})` },
            ]}
            valor={aba}
            onChange={setAba}
            rotulo="Sobre o produto"
            idBase="produto"
          />
          <div id="produto-painel" role="tabpanel" aria-labelledby={`produto-${aba}`} className="pt-4">
            {aba === "descricao" ? (
              <p className="max-w-[65ch] text-[14px] leading-relaxed text-ink-2">
                {produto.description || "Este produto ainda não tem descrição."}
              </p>
            ) : (
              <Avaliacoes produto={produto} />
            )}
          </div>
        </div>

        <Card className="h-fit p-[18px]">
          <CardTitle>Informações</CardTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-muted">Código</dt>
            <dd className="tabular-nums">{produto.sku}</dd>
            <dt className="text-muted">Categoria</dt>
            <dd>{categoria}</dd>
            {produto.usesSizes && produto.sizes.length > 0 && (
              <>
                <dt className="text-muted">Numeração</dt>
                <dd className="tabular-nums">
                  {produto.sizes[0].size} ao {produto.sizes[produto.sizes.length - 1].size}
                </dd>
              </>
            )}
          </dl>
        </Card>
      </div>

      {relacionados.length > 0 && (
        <section aria-labelledby="relacionados" className="flex flex-col gap-3">
          <h2 id="relacionados" className="text-[18px] font-semibold tracking-[-.01em]">Você também pode gostar</h2>
          <ul className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[520px]:gap-3">
            {relacionados.map((p: Product) => (
              <li key={p.sku}>
                <CardProduto
                  product={p}
                  quantidade={quantidades[p.sku] ?? 0}
                  bonus={account?.bonusPercent ?? 0}
                  numeroDoCliente={numeroDoCliente}
                  onAdd={(item) => {
                    addToCart(item.sku, null);
                    notify(`${item.name} no carrinho`);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Botões de numeração, com rádios nativos (setas do teclado trocam, o leitor de tela lê "Numeração 40").
// Número esgotado fica riscado e não dá para escolher; o do perfil do cliente tem um pontinho embaixo.
function EscolherNumero({ produto, numero, numeroDoCliente, onChange }: {
  produto: ProductDetail;
  numero: number | null;
  numeroDoCliente: number | null;
  onChange: (numero: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-baseline justify-between text-[13px] font-medium">
        <span>Numeração {numero !== null && <span className="text-muted">· {numero}</span>}</span>
        {numeroDoCliente === null && (
          <Link to="/minha-conta#dados" className="text-[12px] font-normal text-muted underline underline-offset-2">
            Salvar meu número no perfil
          </Link>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {produto.sizes.map((s) => {
          const esgotado = s.quantity === 0;
          const selecionado = numero === s.size;
          return (
            <label
              key={s.size}
              className={`relative grid h-11 min-w-12 place-items-center rounded-lg border px-2 text-[14px] font-medium tabular-nums transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                esgotado
                  ? "cursor-not-allowed border-line bg-subtle text-faint line-through"
                  : selecionado
                    ? "cursor-pointer border-ink bg-ink text-surface"
                    : "cursor-pointer border-line-2 bg-surface hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name="numeracao"
                value={s.size}
                checked={selecionado}
                disabled={esgotado}
                onChange={() => onChange(s.size)}
                className="sr-only"
              />
              <span className="sr-only">Numeração </span>
              {s.size}
              {esgotado && <span className="sr-only"> (esgotada)</span>}
              {s.size === numeroDoCliente && (
                <span
                  className={`absolute bottom-1 size-1 rounded-full ${selecionado ? "bg-surface" : "bg-app"}`}
                  title="Seu número"
                  aria-label="(seu número)"
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// A frase de estoque: para o número escolhido, para o número do cliente, ou para o produto sem numeração.
function Disponibilidade({ produto, numero, numeroDoCliente, estoque }: {
  produto: ProductDetail;
  numero: number | null;
  numeroDoCliente: number | null;
  estoque: number;
}) {
  let texto: string;
  let classe = "text-ok";
  if (produto.stock === 0) {
    texto = "Esgotado no momento";
    classe = "text-danger";
  } else if (produto.usesSizes && numero === null) {
    const semODoCliente = numeroDoCliente !== null && disponivel(produto, numeroDoCliente) === 0;
    const naGrade = produto.sizes.some((s) => s.size === numeroDoCliente);
    texto = !semODoCliente
      ? "Escolha a numeração para ver quantos temos."
      : naGrade
        ? `Não temos o seu nº ${numeroDoCliente} agora. Veja os números disponíveis acima.`
        : `Este modelo não vem no seu nº ${numeroDoCliente}.`;
    classe = semODoCliente ? "text-danger" : "text-muted";
  } else if (estoque <= POUCAS_UNIDADES) {
    texto = `Últimas ${estoque} ${plural(estoque, "unidade", "unidades")}${numero !== null ? ` no nº ${numero}` : ""}`;
    classe = "text-accent-ink";
  } else {
    texto = `${formatNumber(estoque)} em estoque${numero !== null ? ` no nº ${numero}` : ""}`;
  }
  return (
    <p className={`text-[13.5px] font-medium ${classe}`} role="status">
      {texto}
    </p>
  );
}

function Avaliacoes({ produto }: { produto: ProductDetail }) {
  if (produto.reviewCount === 0) {
    return (
      <p className={hintClass}>
        Ninguém avaliou ainda. Comprou? Avalie em{" "}
        <Link to="/minha-conta/avaliacoes" className="font-medium text-ink underline underline-offset-2">Minha conta › Avaliações</Link>{" "}
        e ganhe pontos.
      </p>
    );
  }
  const maior = Math.max(...produto.byRating.map((n) => n.count));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <strong className="block text-[34px] leading-none font-semibold tabular-nums">
            {produto.rating?.toFixed(1).replace(".", ",")}
          </strong>
          <Estrelas nota={Math.round(produto.rating ?? 0)} tamanho={14} />
          <small className="block text-xs text-muted">
            {produto.reviewCount} {plural(produto.reviewCount, "avaliação", "avaliações")}
          </small>
        </div>
        <ul className="flex min-w-[200px] flex-1 flex-col gap-1">
          {produto.byRating.map((n) => (
            <li key={n.rating} className="flex items-center gap-2 text-[12px] text-muted">
              <span className="w-3 tabular-nums">{n.rating}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${maior ? (100 * n.count) / maior : 0}%` }} />
              </span>
              <span className="w-6 text-right tabular-nums">{n.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {produto.comments.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 py-3 first:pt-0">
            <span className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <Estrelas nota={c.rating} tamanho={13} />
              <b className="font-medium">{c.name}</b>
              <span className="text-muted">{formatDay(c.date)}</span>
            </span>
            <p className="text-[13.5px] text-ink-2">{c.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Produto;
