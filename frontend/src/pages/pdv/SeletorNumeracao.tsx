import { Modal } from "../../components/ui/Modal";
import { SITUACOES } from "../../components/ui/situacaoDoEstoque";
import type { Product } from "../../types";

// Feito com IA: ao somar um calçado no PDV, o atendente escolhe a numeração que o cliente está levando. Cada
// botão mostra o número e quantos pares há, pintado pela situação (verde, âmbar, vermelho). O número zerado
// continua clicável: no caixa o par já está na mão do cliente, então o estoque zerado só quer dizer que a
// contagem está errada (o backend nunca recusa a venda do caixa por estoque). O primeiro número com estoque
// já vem com o foco, para o atendente só apertar Enter ou usar Tab.
function SeletorNumeracao({ product, onPick, onClose }: {
  product: Product;
  onPick: (size: number) => void;
  onClose: () => void;
}) {
  const primeiroComEstoque = product.sizes.find((s) => s.quantity > 0)?.size;

  return (
    <Modal title={`Numeração · ${product.name}`} onClose={onClose}>
      <p className="mb-3 text-[13px] text-muted">Qual número o cliente está levando?</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2">
        {product.sizes.map((s) => (
          <li key={s.size}>
            <button
              type="button"
              autoFocus={s.size === primeiroComEstoque}
              onClick={() => onPick(s.size)}
              aria-label={`Numeração ${s.size}, ${s.quantity === 0 ? "sem estoque" : `${s.quantity} em estoque`}`}
              className={`flex w-full flex-col items-center rounded-lg border py-2 transition-shadow hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${SITUACOES[s.status].celula}`}
            >
              <b className="text-[17px] leading-tight font-semibold text-ink tabular-nums">{s.size}</b>
              <small className="text-[11px] font-medium tabular-nums">
                {s.quantity === 0 ? "sem estoque" : `${s.quantity} ${s.quantity === 1 ? "par" : "pares"}`}
              </small>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default SeletorNumeracao;
