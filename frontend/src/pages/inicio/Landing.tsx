import { ArrowRight, Layers, Plus, Star, ShieldCheck, ShoppingBag, Ticket, TrendingUp, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import fotoLoja from "../../assets/loja/hero.jpg";
import { useProgressoScroll } from "../../hooks/useProgressoScroll";
import { container, titulo } from "./estilos";
import { GALERIA, foto } from "./fotos";
import VitrineTenis from "./VitrineTenis";

// Feito com IA: todo número desta página espelha `backend/src/regras.py` (níveis, bônus, bloco de
// resgate, validade). São texto de vitrine, não regra: se as regras mudarem, atualize aqui junto.

// Cada carta tem um fundo da paleta da logo (vinho, preto, branco, cinza), para a fileira não virar
// cinco caixas iguais. `clara` diz se o texto vai claro sobre o fundo.
const CARTAS: { titulo: string; texto: string; Icone: LucideIcon; fundo: string; clara: boolean }[] = [
  { titulo: "Compre", texto: "Cada real pago vira 1 ponto. Basta o CPF no caixa.", Icone: ShoppingBag, fundo: "bg-(--l-vinho)", clara: true },
  { titulo: "Acumule", texto: "Cada compra gera um lote de pontos válido por 12 meses.", Icone: Layers, fundo: "bg-(--l-ink)", clara: true },
  { titulo: "Suba de nível", texto: "Prata soma +10% e Ouro +20% em cada compra.", Icone: TrendingUp, fundo: "bg-white", clara: false },
  { titulo: "Resgate", texto: "A cada 100 pontos, R$ 5,00 de desconto.", Icone: Ticket, fundo: "bg-(--l-cinza)", clara: false },
  { titulo: "Sem cair", texto: "O nível conta o que você acumulou, não o saldo.", Icone: ShieldCheck, fundo: "bg-(--l-vinho-escuro)", clara: true },
];

const NIVEIS = [
  { nome: "Bronze", requisito: "Ao se cadastrar", bonus: "0%" },
  { nome: "Prata", requisito: "1.000 pontos em 12 meses", bonus: "+10%" },
  { nome: "Ouro", requisito: "5.000 pontos em 12 meses", bonus: "+20%" },
];

// Texto que acende palavra por palavra no scroll. As palavras com * ficam em rosa.
const MANIFESTO =
  "Cada real vira ponto. Cada ponto vira desconto. E quem volta sempre *ganha* *mais* em cada compra.";

const limitar = (v: number) => Math.min(1, Math.max(0, v));
const suavizar = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Landing() {
  return (
    <div className="landing min-h-svh">
      <VitrineTenis topo={<Cabecalho />} />

      <main>
        <CartasNoScroll />
        <Manifesto />
        <Galeria />

        <section id="niveis" className="bg-(--l-cinza) py-28 text-(--l-ink) sm:py-40">
          <div className={container}>
            <h2 className={`${titulo} max-w-[14ch]`}>Quanto mais você compra, mais rende.</h2>
            <ul className="mt-20">
              {NIVEIS.map((n) => (
                <li
                  key={n.nome}
                  className="group grid items-baseline gap-x-8 gap-y-1 border-t border-(--l-ink)/20 py-9 last:border-b sm:grid-cols-[1fr_1.4fr_auto] sm:py-12"
                >
                  <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-semibold tracking-[-.03em]">{n.nome}</h3>
                  <p className="text-(--l-cinza-texto)">{n.requisito}</p>
                  <p className="text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-semibold tracking-[-.03em] tabular-nums transition-colors duration-300 group-hover:text-(--l-vinho) sm:text-right">
                    {n.bonus}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-[52ch] text-[15px] text-(--l-cinza-texto)">
              O bônus usa o nível de antes da compra, sobre o valor pago sem os centavos. No resgate, os pontos
              mais antigos são usados primeiro.
            </p>
          </div>
        </section>

        <Avaliacoes />
        <Perguntas />
        <Chamada />
      </main>

      <footer className="bg-(--l-vinho-escuro) py-10 text-(--l-rosa)">
        <div className={`${container} flex flex-wrap items-center justify-between gap-4 text-[14px]`}>
          <span className="flex items-center gap-3 font-medium text-white">
            <Logo tamanho="size-8" />
            FATECalçados
          </span>
          <span>Desafio de Inovação Data System 2026 · Fotos: Unsplash</span>
        </div>
      </footer>
    </div>
  );
}

// A logo tem vinho e cinza, que somem em alguns fundos da vitrine; por isso ela fica sempre num selo branco.
function Logo({ tamanho }: { tamanho: string }) {
  return (
    <span className={`grid ${tamanho} flex-none place-items-center rounded-xl bg-white shadow-[0_6px_16px_-6px_rgb(0_0_0/.4)]`}>
      <img src="/fatec-icon.svg" alt="" className="w-[72%]" />
    </span>
  );
}

function Cabecalho() {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className={`${container} flex h-24 items-center justify-between`}>
        <Link to="/" aria-label="FATECalçados, início" className="flex items-center gap-3 text-[17px] font-semibold tracking-[-.02em]">
          <Logo tamanho="size-10" />
          <span className="hidden min-[440px]:inline">FATECalçados</span>
        </Link>
        <nav className="flex items-center gap-5 text-[14px] font-medium sm:gap-6">
          <Link to="/dashboard" className="underline-offset-4 hover:underline max-sm:hidden">
            Área da loja
          </Link>
          <Link to="/login" className="underline-offset-4 hover:underline">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-full border border-(--h-tinta)/35 px-4 py-2 transition-colors hover:border-(--h-tinta)"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Carta({ titulo, texto, Icone, fundo, clara }: (typeof CARTAS)[number]) {
  return (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl p-6 shadow-[0_24px_40px_-16px_rgb(60_10_10/.35)] ${fundo} ${clara ? "text-white" : "text-(--l-ink)"}`}
    >
      <span className={`grid size-11 place-items-center rounded-xl ${clara ? "bg-white/12" : "bg-(--l-ink)/8"}`}>
        <Icone size={20} aria-hidden />
      </span>
      <div>
        <h3 className="text-xl font-semibold tracking-[-.02em]">{titulo}</h3>
        <p className="mt-2 text-[14px] leading-snug opacity-85">{texto}</p>
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
    <div id="como-funciona" className="bg-(--l-osso) text-(--l-ink)">
      <section ref={ref} className="relative hidden h-[260vh] lg:block">
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
    </div>
  );
}

// Feito com IA: texto grande que acende palavra por palavra enquanto a seção passa presa na tela.
// Só muda opacidade, nada se move, então roda mesmo com movimento reduzido.
function Manifesto() {
  const [ref, progresso] = useProgressoScroll<HTMLElement>({ respeitarMovimentoReduzido: false });
  const palavras = MANIFESTO.split(" ");
  const avanco = limitar((progresso - 0.05) / 0.8) * palavras.length;

  return (
    <section ref={ref} className="relative h-[220vh] bg-(--l-vinho)">
      <div className="sticky top-0 flex h-svh items-center">
        <p className={`${container} text-[clamp(2.25rem,6.5vw,5rem)] leading-[1.05] font-semibold tracking-[-.035em]`}>
          {palavras.map((bruta, i) => {
            const destaque = bruta.startsWith("*");
            const palavra = bruta.replaceAll("*", "");
            const luz = limitar(avanco - i);
            return (
              <span
                key={i}
                className={destaque ? "text-(--l-rosa)" : "text-white"}
                style={{ opacity: 0.22 + 0.78 * luz, transition: "opacity .15s linear" }}
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

// Feito com IA: faixa de fotos que corre devagar da direita para a esquerda. A lista aparece duas vezes
// (a segunda escondida dos leitores de tela) e a animação anda metade da largura, então o loop não tem
// emenda. Para no hover e, com movimento reduzido, fica parada e rola com o mouse ou o teclado.
function Galeria() {
  const fotos = (copia: boolean) =>
    GALERIA.map((g, i) => (
      <li key={`${copia}-${g.id}`} className={i % 2 ? "pt-14" : ""}>
        <img
          src={foto(g.id, 640)}
          alt={copia ? "" : g.alt}
          loading="lazy"
          className="h-[clamp(260px,32vw,420px)] w-auto max-w-none rounded-2xl object-cover [aspect-ratio:3/4]"
        />
      </li>
    ));

  return (
    <section className="bg-(--l-black) py-28 sm:py-40">
      <div className={`${container} flex flex-wrap items-end justify-between gap-6`}>
        <h2 className={`${titulo} max-w-[12ch]`}>Da quadra à calçada.</h2>
        <p className="max-w-[36ch] text-(--l-text-dark)">
          Corrida, casual, basquete, social. Todo par que passa no caixa conta ponto, do tênis do treino ao
          sapato do trabalho.
        </p>
      </div>
      <div
        className="landing-faixa-janela mt-16 overflow-hidden"
        tabIndex={0}
        role="region"
        aria-label="Fotos de tênis"
      >
        <div className="landing-faixa flex w-max">
          <ul className="flex gap-4 pr-4">{fotos(false)}</ul>
          <ul className="flex gap-4 pr-4" aria-hidden>
            {fotos(true)}
          </ul>
        </div>
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
    <section className="bg-(--l-osso) py-28 text-(--l-ink) sm:py-40">
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className={`${titulo} max-w-[13ch]`}>Quem compra, volta.</h2>
          <p className="max-w-[34ch] text-[14px] text-(--l-cinza-texto)">
            Avaliações simuladas, criadas para demonstrar o programa. Não são de clientes reais.
          </p>
        </div>
        <ul className="mt-16 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {AVALIACOES.map((a) => (
            <li
              key={a.nome}
              className="mb-4 break-inside-avoid rounded-2xl bg-white p-7 shadow-[0_10px_30px_-14px_rgb(60_10_10/.25)] transition-shadow duration-300 hover:shadow-[0_22px_44px_-16px_rgb(60_10_10/.35)]"
            >
              <div className="flex gap-1 text-(--l-vinho)" aria-label="5 de 5 estrelas">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} fill="currentColor" strokeWidth={0} aria-hidden />
                ))}
              </div>
              <p className="mt-5 text-[16px] leading-relaxed">“{a.texto}”</p>
              <p className="mt-6 flex items-center justify-between text-[14px]">
                <span className="font-medium">{a.nome}</span>
                <span className="rounded-full bg-(--l-osso) px-2.5 py-0.5 text-[12px] text-(--l-cinza-texto)">
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
    <section className="bg-(--l-black) py-28 sm:py-40">
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

// Fechamento com a foto da loja (assets/loja/hero.jpg): o cinza e o vinho do tênis são os da logo. No
// desktop a foto ocupa a direita e se funde ao fundo osso num degradê; no celular vem embaixo do texto.
function Chamada() {
  return (
    <section className="relative overflow-hidden bg-(--l-osso) pt-28 text-(--l-ink) lg:py-48">
      <div
        aria-hidden
        className="absolute inset-y-0 left-[38%] z-[1] hidden w-[18%] bg-[linear-gradient(90deg,var(--l-osso),transparent)] lg:block"
      />
      <div className={`${container} relative z-10`}>
        <h2 className={`${titulo} max-w-[12ch]`}>Comece pelo caixa.</h2>
        <p className="mt-6 max-w-[34ch] text-[17px] text-(--l-cinza-texto)">
          O cadastro sai na primeira compra, só com o CPF. Os pontos já entram na mesma compra.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            to="/pdv"
            className="inline-flex items-center gap-2 rounded-full bg-(--l-vinho) px-7 py-4 text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgb(143_13_13/.6)] transition-[gap,background-color] duration-200 hover:gap-3 hover:bg-[#a31212]"
          >
            Abrir o PDV <ArrowRight size={18} aria-hidden />
          </Link>
          <Link to="/dashboard" className="text-[15px] font-medium underline-offset-4 hover:underline">
            Ver o dashboard
          </Link>
        </div>
      </div>
      <img
        src={fotoLoja}
        alt="Par de tênis cinza com detalhes vinho sobre blocos de concreto claro"
        loading="lazy"
        className="mt-14 aspect-[16/10] w-full object-cover object-[60%_50%] lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:aspect-auto lg:h-full lg:w-[62%]"
      />
    </section>
  );
}
