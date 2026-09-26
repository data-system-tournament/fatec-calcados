import { ArrowRight } from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useVitrine } from "../../hooks/useVitrine";
import { estimatePoints } from "../../regras";
import { formatMoney, formatNumber } from "../../utils/format";
import { container } from "./estilos";
import { TENIS, foto } from "./fotos";

const DURACAO = 3000;
const OURO = 20; // bônus do Ouro em regras.py, só para o exemplo da legenda
const LARGURA_FOTO = 1200;

// Feito com IA: hero da landing. Texto à esquerda e, à direita, um tênis grande que troca sozinho a cada
// 3 s. O fundo da seção (e do cabeçalho, que vem em `topo`) assume a cor do estúdio da foto atual, e o
// texto alterna entre claro e escuro para manter o contraste. As cores passam por variáveis CSS
// (--h-fundo, --h-tinta) para o cabeçalho e os botões trocarem juntos.
// A troca acontece em três tempos, sem sobreposição, para o retângulo da foto nunca aparecer sobre um
// fundo de outra cor: o tênis atual sai (0 a 300 ms, fundo ainda igual ao da foto), o fundo muda de cor
// (300 a 650 ms, sem foto na tela) e o próximo tênis entra (a partir de 650 ms, fundo já igual ao dele).
// Os tempos estão em index.css (.landing-tenis-*) e no delay/duration da transição abaixo.
export default function VitrineTenis({ topo }: { topo: ReactNode }) {
  const v = useVitrine(TENIS.length, DURACAO);
  const tenis = TENIS[v.atual];
  const saindo = v.anterior !== null && v.anterior !== v.atual ? TENIS[v.anterior] : null;
  const cores = {
    "--h-fundo": tenis.fundo,
    "--h-tinta": tenis.tinta === "clara" ? "#fafafa" : "#0b0b0c",
    "--h-suave": tenis.tinta === "clara" ? "rgb(250 250 250 / .86)" : "rgb(11 11 12 / .78)",
  } as CSSProperties;

  // Baixa e decodifica todas as fotos logo no início: decodificar uma imagem grande na hora da troca é o
  // que travava a animação.
  useEffect(() => {
    for (const t of TENIS) {
      const img = new Image();
      img.src = foto(t.id, LARGURA_FOTO);
      img.decode().catch(() => {});
    }
  }, []);

  return (
    <div
      style={cores}
      className="relative overflow-hidden bg-(--h-fundo) text-(--h-tinta) transition-[background-color,color] delay-[300ms] duration-[350ms] ease-in-out"
    >
      {topo}
      <section
        aria-label="Vitrine de tênis"
        className={`${container} grid min-h-svh items-center gap-x-10 gap-y-6 pt-32 pb-14 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:pt-24`}
      >
        <div className="max-w-[560px]">
          <h1 className="landing-sobe text-[clamp(3.25rem,8.5vw,6rem)] leading-[.94] font-bold tracking-[-.04em] text-balance">
            Cada passo vira ponto.
          </h1>
          <p
            className="landing-sobe mt-7 max-w-[40ch] text-[clamp(1.05rem,1.5vw,1.2rem)] text-(--h-suave)"
            style={{ "--i": 1 } as CSSProperties}
          >
            O programa de fidelidade da FATECalçados. Compre qualquer par, acumule pontos e troque por desconto
            no próximo.
          </p>
          <div className="landing-sobe mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as CSSProperties}>
            <Link
              to="/pdv"
              className="inline-flex items-center gap-2 rounded-full bg-(--h-tinta) px-7 py-4 text-[15px] font-semibold text-(--h-fundo) shadow-[0_12px_28px_-10px_rgb(0_0_0/.45)] transition-[background-color,color] delay-[300ms] duration-[350ms] hover:gap-3"
            >
              Abrir o PDV <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#como-funciona" className="text-[15px] font-medium underline-offset-4 hover:underline">
              Como funciona
            </a>
          </div>
        </div>

        <div>
          <div className="relative aspect-[5/4] w-full overflow-hidden">
            {saindo && <FotoTenis key={`sai-${v.posicao}`} tenis={saindo} classe="landing-tenis-sai" />}
            <FotoTenis key={`entra-${v.posicao}`} tenis={tenis} classe="landing-tenis-entra" />
          </div>

          <p key={v.posicao} className="landing-legenda mt-1 text-center text-[14px] leading-snug text-(--h-suave)">
            <span className="block text-[15px] font-semibold text-(--h-tinta)">{tenis.estilo}</span>
            Exemplo: um par de {formatMoney(tenis.preco)} rende {formatNumber(estimatePoints(tenis.preco, 0))} pontos,
            ou {formatNumber(estimatePoints(tenis.preco, OURO))} no Ouro.
          </p>
        </div>
      </section>
    </div>
  );
}

// A foto preenche o quadro (object-cover) sem máscara: os fundos de estúdio são lisos e iguais à cor da
// seção, então a borda da foto não aparece.
function FotoTenis({ tenis, classe }: { tenis: (typeof TENIS)[number]; classe: string }) {
  return (
    <div className={`absolute inset-0 ${classe}`}>
      <img
        src={foto(tenis.id, LARGURA_FOTO)}
        alt={tenis.alt}
        decoding="async"
        className="landing-tenis-flutua size-full object-cover"
        style={{ objectPosition: tenis.foco }}
      />
    </div>
  );
}
