import type { ReactNode } from "react";
import { BLOCK_VALUE, estimatePoints, NIVEIS, POINTS_PER_BLOCK, REVIEW_POINTS, VALIDITY_MONTHS } from "../../regras";
import { formatMoney, formatNumber } from "../../utils/format";
import { Button } from "../ui/Button";
import { corDoNivel } from "../ui/corDoNivel";
import { Modal } from "../ui/Modal";

// Exemplo usado nos textos: uma compra de R$ 289,90 feita por um cliente Prata.
const EXEMPLO = { valor: 289.9, nivel: NIVEIS[1] };

// Feito com IA: resumo das regras do programa, aberto pela sidebar ("Como funcionam os pontos"). O mesmo
// conteúdo serve às duas áreas, só muda a voz: para o cliente fala com "você"; para a loja fala "o cliente"
// e acrescenta o que importa no caixa. Os números vêm de regras.ts (espelho de regras.py).
export function PainelAjuda({ publico, onClose }: { publico: "cliente" | "loja"; onClose: () => void }) {
  const cliente = publico === "cliente";
  const quem = cliente ? "você" : "o cliente";
  const bloco = `${formatNumber(POINTS_PER_BLOCK)} pts = ${formatMoney(BLOCK_VALUE)}`;
  const exemploPontos = estimatePoints(EXEMPLO.valor, EXEMPLO.nivel.bonus);

  return (
    <Modal
      title="Como funcionam os pontos"
      onClose={onClose}
      footer={<Button variant="dark" onClick={onClose}>Entendi</Button>}
    >
      <div className="flex flex-col gap-5 text-[13.5px] leading-relaxed">
        <Secao titulo={cliente ? "Como você ganha pontos" : "Como o cliente ganha pontos"}>
          <ul className="flex flex-col gap-2">
            <Ganho valor="1 pt por R$ 1">
              Em cada compra, na loja ou online, identificada pelo CPF. Os centavos não contam.
            </Ganho>
            <Ganho valor="+10% / +20%">
              Bônus do nível Prata e Ouro sobre os pontos da compra. Ex.: {formatMoney(EXEMPLO.valor)} no
              nível {EXEMPLO.nivel.nome} rendem {formatNumber(exemploPontos)} pts.
            </Ganho>
            <Ganho valor={`+${REVIEW_POINTS} pts`}>
              Por avaliar um produto comprado (nota e comentário), uma vez por produto.
            </Ganho>
          </ul>
        </Secao>

        <Secao titulo="Níveis">
          <ul className="flex flex-col">
            {NIVEIS.map((nivel, i) => {
              const proximo = NIVEIS[i + 1];
              const faixa = proximo
                ? `${formatNumber(nivel.minimo)} a ${formatNumber(proximo.minimo - 1)} pts`
                : `${formatNumber(nivel.minimo)} pts ou mais`;
              return (
                <li key={nivel.nome} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`size-2 rounded-full ${corDoNivel(nivel.nome)}`} aria-hidden />
                    {nivel.nome}
                  </span>
                  <span className="text-muted">{faixa}</span>
                  <span className="w-24 text-right">{nivel.bonus ? `+${nivel.bonus}% de bônus` : "sem bônus"}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[13px] text-muted">
            Contam os pontos acumulados nos últimos 12 meses. Usar pontos não faz {quem} cair de nível.
          </p>
        </Secao>

        <Secao titulo="Usar e perder pontos">
          <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-faint">
            <li>
              {bloco} de desconto, sempre em blocos de {formatNumber(POINTS_PER_BLOCK)}; o desconto não passa do valor da compra.
            </li>
            <li>
              {cliente
                ? "Na loja, informe o CPF no caixa; online, escolha quantos pontos usar no carrinho."
                : "No caixa, informe o CPF do cliente e escolha quantos pontos usar; online, ele escolhe no carrinho."}
            </li>
            <li>
              Cada compra vira um lote que vale {VALIDITY_MONTHS} meses. Os lotes mais antigos são usados primeiro, e o
              que sobrar depois do prazo vence.
            </li>
          </ul>
        </Secao>

        {!cliente && (
          <Secao titulo="No caixa">
            <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-faint">
              <li>Venda sem CPF não gera pontos: vale perguntar o CPF antes de fechar a venda.</li>
              <li>Os pontos saem do valor pago, já com o desconto do resgate.</li>
              <li>O bônus usa o nível que o cliente tinha antes da compra.</li>
            </ul>
          </Secao>
        )}
      </div>
    </Modal>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{titulo}</h4>
      {children}
    </section>
  );
}

function Ganho({ valor, children }: { valor: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[6.5rem_1fr] gap-3">
      <b className="font-semibold tabular-nums">{valor}</b>
      <span className="text-ink-2">{children}</span>
    </li>
  );
}
