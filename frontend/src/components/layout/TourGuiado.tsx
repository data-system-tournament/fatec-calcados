import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "../ui/Button";
import type { PassoTour } from "./passosTour";

type Retangulo = { top: number; left: number; width: number; height: number };

const LARGURA_CARD = 320;
const FOLGA = 6; // o contorno branco fica um pouco afastado do item
const DISTANCIA = 14; // do contorno até o cartão
const MARGEM = 16; // do cartão até a borda da janela

function mesmo(a: Retangulo | null, b: Retangulo | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function limitar(valor: number, min: number, max: number) {
  return Math.max(min, Math.min(valor, max));
}

// À direita do item quando cabe (desktop); senão embaixo, ou em cima se embaixo também não couber (celular).
function posicionarCartao(alvo: Retangulo, altura: number): { top: number; left: number } {
  const { innerWidth, innerHeight } = window;
  const direita = alvo.left + alvo.width + FOLGA + DISTANCIA;

  if (direita + LARGURA_CARD + MARGEM <= innerWidth) {
    return { left: direita, top: limitar(alvo.top + alvo.height / 2 - altura / 2, MARGEM, innerHeight - altura - MARGEM) };
  }

  const left = limitar(alvo.left, MARGEM, innerWidth - LARGURA_CARD - MARGEM);
  const abaixo = alvo.top + alvo.height + FOLGA + DISTANCIA;
  if (abaixo + altura + MARGEM <= innerHeight) return { left, top: abaixo };
  return { left, top: Math.max(MARGEM, alvo.top - FOLGA - DISTANCIA - altura) };
}

// Feito com IA: tour guiado. Escurece a tela, destaca com contorno branco o item da sidebar do passo
// atual (achado por data-tour) e mostra um cartão explicando. Como a gaveta do celular anima ao abrir e o
// usuário pode redimensionar a janela, a posição é relida a cada frame em vez de calculada uma vez só.
export function TourGuiado({ passos, passo, onProximo, onAnterior, onPular }: {
  passos: PassoTour[];
  passo: number;
  onProximo: () => void;
  onAnterior: () => void;
  onPular: () => void;
}) {
  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;
  const [alvo, setAlvo] = useState<Retangulo | null>(null);
  const [altura, setAltura] = useState(180);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const proximoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    function medir() {
      const el = atual.alvo ? document.querySelector(`[data-tour="${atual.alvo}"]`) : null;
      const r = el?.getBoundingClientRect();
      const novo = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      setAlvo((antigo) => (mesmo(antigo, novo) ? antigo : novo));
      const h = cartaoRef.current?.offsetHeight;
      if (h) setAltura((antiga) => (antiga === h ? antiga : h));
      frame = requestAnimationFrame(medir);
    }
    medir();
    return () => cancelAnimationFrame(frame);
  }, [atual.alvo]);

  useEffect(() => {
    proximoRef.current?.focus();
  }, [passo]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onPular();
      else if (event.key === "ArrowRight") onProximo();
      else if (event.key === "ArrowLeft" && passo > 0) onAnterior();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [passo, onProximo, onAnterior, onPular]);

  const posicao = alvo ? posicionarCartao(alvo, altura) : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Bloqueia cliques na tela por trás durante o tour. Sem alvo, também é o fundo escurecido. */}
      <div className={`absolute inset-0 ${alvo ? "" : "bg-[rgba(9,9,11,.6)]"}`} aria-hidden="true" />

      {alvo && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-2 ring-white shadow-[0_0_0_9999px_rgba(9,9,11,.6)] transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none"
          style={{
            top: alvo.top - FOLGA,
            left: alvo.left - FOLGA,
            width: alvo.width + FOLGA * 2,
            height: alvo.height + FOLGA * 2,
          }}
        />
      )}

      <div
        className={posicao ? "absolute" : "absolute inset-0 grid place-items-center p-4"}
        style={posicao ? { top: posicao.top, left: posicao.left, width: LARGURA_CARD } : undefined}
      >
        <div
          ref={cartaoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-titulo"
          aria-describedby="tour-texto"
          className="w-full max-w-[320px] rounded-lg border border-line bg-surface p-4 text-ink shadow-pop"
        >
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
            Passo {passo + 1} de {passos.length}
          </p>
          <h2 id="tour-titulo" className="mb-1.5 text-[15px] font-semibold">{atual.titulo}</h2>
          <p id="tour-texto" className="mb-4 text-[13px] leading-relaxed text-ink-2">{atual.texto}</p>

          <div className="flex items-center justify-between gap-2">
            {ultimo ? <span /> : <LinkButton onClick={onPular}>Pular tour</LinkButton>}
            <div className="flex gap-2">
              {passo > 0 && <Button size="sm" onClick={onAnterior}>Voltar</Button>}
              <Button ref={proximoRef} size="sm" variant="dark" onClick={onProximo}>
                {ultimo ? "Concluir" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
