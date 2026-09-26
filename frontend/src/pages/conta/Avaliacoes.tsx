import { Coins, MessageSquareText, ShoppingBag, type LucideIcon } from "lucide-react";
import { createElement, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Abas } from "../../components/ui/Abas";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import { errorClass, hintClass, inputClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { useCarregar } from "../../hooks/useCarregar";
import { errorMessage, fetchReviews, sendReview } from "../../services/api";
import type { PendingReview, Reviews } from "../../types";
import { formatDay, formatNumber } from "../../utils/format";
import { TONS } from "../dashboard/tons";
import { iconeDoProduto } from "../pdv/categorias";
import { EscolherNota, Estrelas } from "../../components/ui/Estrelas";

type Aba = "pendentes" | "feitas";

// "Minha conta › Avaliações": o cliente avalia os produtos que comprou (no caixa da loja ou na loja
// online) e ganha pontos por isso, uma vez por produto. As regras (quantos pontos, comentário mínimo)
// chegam da API junto com a lista; o backend (services.avaliar_produto) é quem valida de verdade.
function Avaliacoes() {
  const carregado = useCarregar(fetchReviews, "avaliacoes");
  // Depois de avaliar, a resposta do POST já traz a lista nova e substitui a carregada.
  const [atualizada, setAtualizada] = useState<Reviews | null>(null);
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const [avaliando, setAvaliando] = useState<PendingReview | null>(null);
  const reviews = atualizada ?? carregado.data;

  if (!reviews) {
    return carregado.error ? (
      <ErrorState title="Não foi possível carregar suas avaliações" message={carregado.error} onRetry={carregado.retry} />
    ) : (
      <p className={hintClass} role="status">Carregando suas avaliações...</p>
    );
  }

  // Sem escolha, abre onde há algo a fazer.
  const aba = escolhida ?? (reviews.pending.length > 0 ? "pendentes" : "feitas");
  const abas = [
    { valor: "pendentes", rotulo: `Para avaliar (${reviews.pending.length})` },
    { valor: "feitas", rotulo: `Minhas avaliações (${reviews.done.length})` },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-[13.5px] ${TONS.azul.painel}`}>
        <Coins size={18} className={`flex-none ${TONS.azul.icone}`} aria-hidden />
        <span>
          Avalie o que você comprou, na loja ou online, e ganhe{" "}
          <b className="font-semibold">{formatNumber(reviews.pointsPerReview)} pts</b> por produto avaliado.
        </span>
      </div>

      <Abas abas={abas} valor={aba} onChange={setEscolhida} rotulo="Avaliações" idBase="avaliacoes" />

      <div id="avaliacoes-painel" role="tabpanel" aria-labelledby={`avaliacoes-${aba}`}>
        {aba === "pendentes" ? (
          <Pendentes reviews={reviews} onAvaliar={setAvaliando} />
        ) : (
          <Feitas reviews={reviews} />
        )}
      </div>

      {avaliando && (
        <ModalAvaliar
          produto={avaliando}
          reviews={reviews}
          onClose={() => setAvaliando(null)}
          onEnviada={(nova) => {
            setAtualizada(nova);
            setAvaliando(null);
          }}
        />
      )}
    </div>
  );
}

function Pendentes({ reviews, onAvaliar }: { reviews: Reviews; onAvaliar: (produto: PendingReview) => void }) {
  if (reviews.pending.length === 0) {
    return (
      <Vazio icone={ShoppingBag} texto={reviews.done.length ? "Você já avaliou tudo o que comprou." : "Compre um produto para poder avaliá-lo."}>
        <Link to="/loja" className="rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-surface">Ver produtos</Link>
      </Vazio>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
      {reviews.pending.map((produto) => (
        <li key={produto.sku}>
          <Card className="flex h-full items-center gap-3 p-3">
            <FotoPequena nome={produto.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{produto.name}</span>
              <small className="text-xs text-muted">Comprado em {formatDay(produto.lastPurchase)}</small>
            </span>
            <Button size="sm" variant="dark" onClick={() => onAvaliar(produto)}>
              Avaliar · +{formatNumber(reviews.pointsPerReview)} pts
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Feitas({ reviews }: { reviews: Reviews }) {
  if (reviews.done.length === 0) {
    return <Vazio icone={MessageSquareText} texto="Suas avaliações aparecem aqui." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.done.map((avaliacao) => (
        <li key={avaliacao.sku}>
          <Card className="flex gap-3 p-[18px]">
            <FotoPequena nome={avaliacao.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-[13.5px] font-medium">{avaliacao.name}</span>
                <small className={`text-xs font-medium tabular-nums ${TONS.azul.icone}`}>+{formatNumber(avaliacao.points)} pts</small>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Estrelas nota={avaliacao.rating} />
                <small className="text-xs text-muted">{formatDay(avaliacao.date)}</small>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{avaliacao.comment}</p>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function ModalAvaliar({ produto, reviews, onClose, onEnviada }: {
  produto: PendingReview;
  reviews: Reviews;
  onClose: () => void;
  onEnviada: (reviews: Reviews) => void;
}) {
  const { reload } = useConta();
  const notify = useToast();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caracteres = comentario.trim().length;
  const faltam = Math.max(0, reviews.minComment - caracteres);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Mesmo aviso que o backend daria, sem esperar a ida e volta.
    if (!nota) return setErro("Escolha uma nota de 1 a 5 estrelas.");
    if (faltam > 0) return setErro(`Conte um pouco mais sobre o produto: faltam ${faltam} caracteres.`);
    setEnviando(true);
    setErro("");
    try {
      const nova = await sendReview(produto.sku, nota, comentario.trim());
      onEnviada(nova);
      notify(`Avaliação enviada: +${formatNumber(reviews.pointsPerReview)} pts`);
      // O saldo mudou: atualiza o cabeçalho e a sidebar.
      reload().catch(() => {});
    } catch (error) {
      setErro(errorMessage(error));
      setEnviando(false);
    }
  }

  return (
    <Modal
      title={`Avaliar ${produto.name}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="dark" type="submit" form="form-avaliacao" disabled={enviando}>
            {enviando ? "Enviando..." : `Enviar e ganhar ${formatNumber(reviews.pointsPerReview)} pts`}
          </Button>
        </>
      }
    >
      <form id="form-avaliacao" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <EscolherNota nota={nota} onChange={setNota} nome="nota-avaliacao" />
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
          O que você achou?
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Conforto, tamanho, acabamento..."
            aria-describedby="avaliacao-contador"
            className={`${inputClass} resize-y`}
          />
        </label>
        <small id="avaliacao-contador" className={`-mt-2 text-xs ${faltam ? "text-muted" : "text-ok"}`}>
          {faltam ? `Mínimo de ${reviews.minComment} caracteres · faltam ${faltam}` : "Pronto para enviar"}
        </small>
        {erro && <p className={errorClass} role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}

function FotoPequena({ nome }: { nome: string }) {
  return (
    <span className="grid size-14 flex-none place-items-center rounded-lg border border-line bg-foto" aria-hidden>
      {createElement(iconeDoProduto(nome), { size: 24, strokeWidth: 1.4, className: "text-faint" })}
    </span>
  );
}

function Vazio({ icone, texto, children }: { icone: LucideIcon; texto: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      {createElement(icone, { size: 28, className: "text-faint", "aria-hidden": true })}
      <p className={hintClass}>{texto}</p>
      {children}
    </Card>
  );
}

export default Avaliacoes;
