import { ArrowRight, Layers, Plus, Star, ShieldCheck, ShoppingBag, Ticket, TrendingUp, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useProgressoScroll } from "../../hooks/useProgressoScroll";

// Feito com IA: todo número desta página espelha `backend/src/regras.py` (níveis, bônus, bloco de
// resgate, validade). São texto de vitrine, não regra: se as regras mudarem, atualize aqui junto.

const CARTAS: { titulo: string; texto: string; Icone: LucideIcon }[] = [
  { titulo: "Compre", texto: "Cada real pago vira 1 ponto. Basta o CPF no caixa.", Icone: ShoppingBag },
  { titulo: "Acumule", texto: "Cada compra gera um lote de pontos válido por 12 meses.", Icone: Layers },
  { titulo: "Suba de nível", texto: "Prata soma +10% e Ouro +20% em cada compra.", Icone: TrendingUp },
  { titulo: "Resgate", texto: "A cada 100 pontos, R$ 5,00 de desconto.", Icone: Ticket },
  { titulo: "Sem cair", texto: "O nível conta o que você acumulou, não o saldo.", Icone: ShieldCheck },
];

const NIVEIS = [
  { nome: "Bronze", requisito: "Ao se cadastrar", bonus: "0%" },
  { nome: "Prata", requisito: "1.000 pontos em 12 meses", bonus: "+10%" },
  { nome: "Ouro", requisito: "5.000 pontos em 12 meses", bonus: "+20%" },
];

// Texto que acende palavra por palavra no scroll. As palavras com * ficam em vinho.
const MANIFESTO =
  "Cada real vira ponto. Cada ponto vira desconto. E quem volta sempre *ganha* *mais* em cada compra.";

const container = "mx-auto w-full max-w-[1120px] px-6 sm:px-10";
const titulo = "text-[clamp(2.25rem,6vw,4rem)] leading-[1.02] font-semibold tracking-[-.035em] text-balance";
const botao =
  "inline-flex items-center gap-2 rounded-full bg-(--l-white) px-7 py-4 text-[15px] font-medium text-(--l-black) " +
  "transition-[gap,background-color] duration-200 hover:gap-3 hover:bg-white";

const limitar = (v: number) => Math.min(1, Math.max(0, v));
const suavizar = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Landing() {
  return (
    <div className="landing min-h-svh">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className={`${container} flex h-24 items-center justify-between`}>
          <Link to="/" className="text-[17px] font-semibold tracking-[-.02em]">
            FATECalçados
          </Link>
          <nav className="flex items-center gap-6 text-[14px]">
            <Link to="/dashboard" className="text-(--l-text-dark) transition-colors hover:text-(--l-white)">
              Entrar
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full border border-(--l-line-dark) px-4 py-2 font-medium transition-colors hover:border-(--l-vinho-claro)"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pt-44 pb-28 sm:pt-60 sm:pb-40">
          {/* Brilho vinho atrás do título, que flutua devagar (landing-brilho em index.css). */}
          <div
            aria-hidden
            className="landing-brilho pointer-events-none absolute -top-40 right-[-10%] size-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(125,26,40,.6),transparent)] blur-2xl"
          />
          <div className={`${container} relative`}>
            <h1
              className="landing-sobe max-w-[10ch] text-[clamp(3.25rem,11vw,6rem)] leading-[.96] font-semibold tracking-[-.04em] text-balance"
              style={{ "--i": 0 } as CSSProperties}
            >
              Cada passo vira <span className="text-(--l-vinho-claro)">ponto.</span>
            </h1>
            <p
              className="landing-sobe mt-8 max-w-[38ch] text-[clamp(1.05rem,1.6vw,1.25rem)] text-(--l-text-dark)"
              style={{ "--i": 1 } as CSSProperties}
            >
              O programa de fidelidade da FATECalçados. Compre, acumule e troque por desconto.
            </p>
            <div className="landing-sobe mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as CSSProperties}>
              <Link to="/pdv" className={botao}>
                Abrir o PDV <ArrowRight size={18} aria-hidden />
              </Link>
              <a href="#como-funciona" className="text-[15px] text-(--l-text-dark) transition-colors hover:text-(--l-white)">
                Como funciona
              </a>
            </div>
          </div>
        </section>

        <CartasNoScroll />
        <Manifesto />

        <section id="niveis" className="py-28 sm:py-40">
          <div className={container}>
            <h2 className={`${titulo} max-w-[14ch]`}>Quanto mais você compra, mais rende.</h2>
            <ul className="mt-20">
              {NIVEIS.map((n) => (
                <li
                  key={n.nome}
                  className="group grid items-baseline gap-x-8 gap-y-1 border-t border-(--l-line-dark) py-9 last:border-b sm:grid-cols-[1fr_1.4fr_auto] sm:py-12"
                >
                  <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-semibold tracking-[-.03em]">{n.nome}</h3>
                  <p className="text-(--l-text-dark)">{n.requisito}</p>
                  <p className="text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-semibold tracking-[-.03em] tabular-nums transition-colors duration-300 group-hover:text-(--l-vinho-claro) sm:text-right">
                    {n.bonus}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-[52ch] text-[15px] text-(--l-text-dark)">
              O bônus usa o nível de antes da compra, sobre o valor pago sem os centavos. No resgate, os pontos
              mais antigos são usados primeiro.
            </p>
          </div>
        </section>

        <Avaliacoes />
        <Perguntas />

        <section className="bg-(--l-vinho) py-28 sm:py-36">
          <div className={container}>
            <h2 className={`${titulo} max-w-[12ch]`}>Comece pelo caixa.</h2>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to="/pdv" className={botao}>
                Abrir o PDV <ArrowRight size={18} aria-hidden />
              </Link>
              <Link to="/dashboard" className="text-[15px] text-white/75 transition-colors hover:text-white">
                Ver o dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10">
        <div className={`${container} flex flex-wrap items-center justify-between gap-4 text-[14px] text-(--l-text-dark)`}>
          <span>FATECalçados</span>
          <span>Desafio de Inovação Data System 2026</span>
        </div>
      </footer>
    </div>
  );
}

function Carta({ titulo, texto, Icone }: (typeof CARTAS)[number]) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-white/8 bg-[linear-gradient(160deg,#232326,#141416)] p-6 shadow-[0_24px_48px_rgba(0,0,0,.45)]">
      <span className="grid size-11 place-items-center rounded-xl bg-(--l-vinho-escuro) text-(--l-vinho-claro)">
        <Icone size={20} aria-hidden />
      </span>
      <div>
        <h3 className="text-xl font-semibold tracking-[-.02em]">{titulo}</h3>
        <p className="mt-2 text-[14px] leading-snug text-(--l-text-dark)">{texto}</p>
      </div>
    </div>
  );
}

// Feito com IA: as cartas começam empilhadas e inclinadas no centro e se abrem numa fileira conforme
// o scroll avança (a seção tem 260vh e o conteúdo fica preso na tela). Abaixo de lg vira grade simples.
function CartasNoScroll() {
  const [ref, progresso] = useProgressoScroll<HTMLElement>();
  const abertura = suavizar(limitar((progresso - 0.1) / 0.7));
  const largura = 200;
  const vao = 16;
  const meio = (CARTAS.length - 1) / 2;

  return (
    <>
      <section id="como-funciona" ref={ref} className="relative hidden h-[260vh] lg:block">
        <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
          <div className={container}>
            <h2 className={`${titulo} max-w-[14ch]`}>Cinco regras. Nenhuma surpresa.</h2>
          </div>
          <div className="relative mt-16 h-[280px]">
            {CARTAS.map((c, i) => {
              const d = i - meio;
              const x = d * 36 * (1 - abertura) + d * (largura + vao) * abertura;
              const y = (i % 2 ? -18 : 14) * (1 - abertura);
              const giro = d * 7 * (1 - abertura);
              return (
                <div
                  key={c.titulo}
                  className="absolute top-0 left-1/2 h-full will-change-transform"
                  style={{
                    width: largura,
                    marginLeft: -largura / 2,
                    transform: `translate3d(${x}px, ${y}px, 0) rotate(${giro}deg)`,
                    zIndex: CARTAS.length - Math.abs(Math.round(d)),
                  }}
                >
                  <Carta {...c} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-28 lg:hidden">
        <div className={container}>
          <h2 className={`${titulo} max-w-[14ch]`}>Cinco regras. Nenhuma surpresa.</h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {CARTAS.map((c) => (
              <div key={c.titulo} className="h-[220px]">
                <Carta {...c} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// Feito com IA: texto grande em cinza que acende palavra por palavra enquanto a seção passa presa na tela.
// Só muda opacidade, nada se move, então roda mesmo com movimento reduzido.
function Manifesto() {
  const [ref, progresso] = useProgressoScroll<HTMLElement>({ respeitarMovimentoReduzido: false });
  const palavras = MANIFESTO.split(" ");
  const avanco = limitar((progresso - 0.05) / 0.8) * palavras.length;

  return (
    <section ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-svh items-center">
        <p className={`${container} text-[clamp(2.25rem,6.5vw,5rem)] leading-[1.05] font-semibold tracking-[-.035em]`}>
          {palavras.map((bruta, i) => {
            const destaque = bruta.startsWith("*");
            const palavra = bruta.replaceAll("*", "");
            const luz = limitar(avanco - i);
            return (
              <span
                key={i}
                className={destaque ? "text-(--l-vinho-claro)" : "text-(--l-white)"}
                style={{ opacity: 0.16 + 0.84 * luz, transition: "opacity .15s linear" }}
              >
                {palavra}{" "}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

// Avaliações FICTÍCIAS, só para demonstrar a seção. A página avisa isso ao visitante.
// Troque por depoimentos reais (com autorização dos clientes) antes de publicar.
const AVALIACOES = [
  {
    nome: "Mariana S.",
    nivel: "Ouro",
    texto: "Comprei o tênis de corrida e o sapato do trabalho no mesmo mês. Na terceira compra já usei os pontos e saiu bem mais barato.",
  },
  {
    nome: "Carlos R.",
    nivel: "Prata",
    texto: "Gosto de não precisar de cartão nem aplicativo. Falo o CPF no caixa e pronto, os pontos já estão lá.",
  },
  {
    nome: "Ana Paula M.",
    nivel: "Prata",
    texto: "Achei justo o nível não cair quando uso os pontos. Troquei por desconto e continuei Prata.",
  },
  {
    nome: "João V.",
    nivel: "Bronze",
    texto: "Primeira compra e o caixa já me explicou tudo. Agora é juntar para os R$ 5,00 a cada 100 pontos.",
  },
  {
    nome: "Fernanda L.",
    nivel: "Ouro",
    texto: "Compro os calçados da família toda aqui. Com o bônus do Ouro os pontos rendem muito mais rápido.",
  },
  {
    nome: "Rafael T.",
    nivel: "Prata",
    texto: "O vendedor mostrou quanto eu tinha e quanto faltava para o próximo nível. Simples de acompanhar.",
  },
];

function Avaliacoes() {
  return (
    <section className="border-t border-(--l-line-dark) py-28 sm:py-40">
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className={`${titulo} max-w-[13ch]`}>Quem compra, volta.</h2>
          <p className="max-w-[34ch] text-[14px] text-(--l-text-dark)">
            Avaliações simuladas, criadas para demonstrar o programa. Não são de clientes reais.
          </p>
        </div>
        <ul className="mt-16 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {AVALIACOES.map((a) => (
            <li
              key={a.nome}
              className="mb-4 break-inside-avoid rounded-2xl border border-white/8 bg-(--l-black-2) p-7 transition-colors duration-300 hover:border-(--l-vinho)"
            >
              <div className="flex gap-1 text-(--l-vinho-claro)" aria-label="5 de 5 estrelas">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} fill="currentColor" strokeWidth={0} aria-hidden />
                ))}
              </div>
              <p className="mt-5 text-[16px] leading-relaxed">“{a.texto}”</p>
              <p className="mt-6 flex items-center justify-between text-[14px]">
                <span className="font-medium">{a.nome}</span>
                <span className="rounded-full border border-(--l-line-dark) px-2.5 py-0.5 text-[12px] text-(--l-text-dark)">
                  Cliente {a.nivel}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PERGUNTAS = [
  ["Como eu entro no programa?", "Basta informar o CPF no caixa na sua primeira compra. O cadastro é feito ali mesmo e os pontos já começam a contar."],
  ["Quanto vale cada ponto?", "Cada 100 pontos valem R$ 5,00 de desconto. O resgate é feito em blocos de 100 pontos, direto no caixa."],
  ["Os pontos expiram?", "Sim. Cada compra gera um lote de pontos que vale por 12 meses. No resgate, os pontos mais antigos são usados primeiro, para você não perder nada."],
  ["Como subo de nível?", "Acumulando pontos nos últimos 12 meses: com 1.000 pontos você vira Prata (+10% em cada compra) e com 5.000 vira Ouro (+20%)."],
  ["Se eu usar meus pontos, caio de nível?", "Não. O nível conta os pontos que você acumulou nos últimos 12 meses, não o saldo. Resgatar não muda o seu nível."],
  ["Os pontos contam sobre o valor com desconto?", "Sim. Os pontos são calculados sobre o valor que você pagou, já com o desconto, sem os centavos."],
];

function Perguntas() {
  return (
    <section className="py-28 sm:py-40">
      <div className={`${container} grid gap-14 lg:grid-cols-[5fr_7fr]`}>
        <h2 className={`${titulo} max-w-[10ch]`}>Perguntas frequentes.</h2>
        <div className="border-b border-(--l-line-dark)">
          {PERGUNTAS.map(([pergunta, resposta]) => (
            <details key={pergunta} className="group border-t border-(--l-line-dark)">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium tracking-[-.01em] transition-colors hover:text-(--l-vinho-claro) [&::-webkit-details-marker]:hidden">
                {pergunta}
                <Plus size={20} aria-hidden className="flex-none text-(--l-text-dark) transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-[60ch] pb-6 text-(--l-text-dark)">{resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
