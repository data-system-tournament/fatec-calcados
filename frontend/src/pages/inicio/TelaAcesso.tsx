import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BotaoTema } from "./BotaoTema";
import InkReveal from "../../components/ui/InkReveal";

// Moldura comum de /login, /cadastro e /admin/entrar: cartão dividido, painel da marca à esquerda e formulário
// à direita, ou (com `fundoSecreto`, em /login e /cadastro) só o cartão sobre uma foto escondida que o ponteiro revela.
// Base da paleta da landing (classe .landing), mas clara ou escura conforme o tema (.landing-acesso).

type TelaAcessoProps = {
  titulo: string;
  subtitulo: string;
  botao: string;
  onSubmit: (dados: FormData) => void;
  // Mensagem de erro da API (CPF inválido, senha errada...), mostrada acima do botão.
  erro?: string;
  enviando?: boolean;
  rodape: ReactNode;
  children: ReactNode;
  // URL de uma foto para a moldura mínima com fundo secreto; sem ela, a moldura dividida.
  fundoSecreto?: string;
};

type ConteudoProps = Omit<TelaAcessoProps, "fundoSecreto">;

export function TelaAcesso({ fundoSecreto, ...props }: TelaAcessoProps) {
  return fundoSecreto ? <TelaComFundoSecreto foto={fundoSecreto} {...props} /> : <TelaDividida {...props} />;
}

// Título, formulário e rodapé: o mesmo miolo nas duas molduras.
function Formulario({ titulo, subtitulo, botao, onSubmit, erro, enviando = false, rodape, children }: ConteudoProps) {
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enviando) onSubmit(new FormData(e.currentTarget));
  }

  return (
    <div className="w-full">
      <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-.03em]">{titulo}</h1>
      <p className="mt-2 text-[15px] text-(--l-texto-2)">{subtitulo}</p>

      <form noValidate onSubmit={enviar} className="mt-9 flex flex-col gap-5">
        {children}
        {erro && (
          <p role="alert" className="rounded-xl border border-(--l-linha) bg-(--l-fundo) px-4 py-3 text-[14px]">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="mt-2 rounded-xl bg-(--l-texto) py-3.5 text-[15px] font-medium text-(--l-fundo) transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Aguarde..." : botao}
        </button>
      </form>

      <p className="mt-7 text-[14px] text-(--l-texto-2)">{rodape}</p>
    </div>
  );
}

function Voltar() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-[14px] text-(--l-texto-2) transition-colors hover:text-(--l-texto)">
      <ArrowLeft size={16} aria-hidden /> Voltar
    </Link>
  );
}

function TelaDividida(props: ConteudoProps) {
  return (
    <div className="landing landing-acesso flex min-h-svh flex-col px-4 sm:px-8">
      <header className="flex h-20 items-center justify-between">
        <Voltar />
        <BotaoTema />
      </header>

      <main className="flex flex-1 items-center justify-center py-6">
        <div className="grid w-full max-w-[1020px] overflow-hidden rounded-3xl border border-(--l-linha) bg-(--l-fundo-2) md:min-h-[600px] md:grid-cols-[1fr_1.1fr]">
          <PainelMarca />

          <div className="flex items-center px-6 py-12 sm:px-14">
            <Formulario {...props} />
          </div>
        </div>
      </main>

      <footer className="flex h-16 items-center justify-end text-[13px] text-(--l-texto-2)">
        © 2026 FATECalçados · Desafio de Inovação Data System
      </footer>
    </div>
  );
}

// O --l-fundo claro (#fafafa) em RGB, fora do componente para não virar um array novo a cada render.
const FUNDO_CLARO: [number, number, number] = [250, 250, 250];

// Feito com IA: moldura mínima de /login e /cadastro. A tela fica branca e vazia (sempre clara, por isso sem
// o botão de tema: .landing-branca) e o ponteiro (ou o dedo) revela por onde passa uma foto de tênis escondida
// embaixo: a foto cobre a tela toda (object-cover, ancorada embaixo, onde estão os tênis) e o InkReveal a tapa
// com um canvas da cor do fundo (#fafafa, o --l-fundo claro). As camadas por cima são pointer-events-none, fora
// os controles, para o canvas continuar recebendo o movimento em volta do cartão.
function TelaComFundoSecreto({ foto, ...props }: ConteudoProps & { foto: string }) {
  return (
    <div className="landing landing-acesso landing-branca relative min-h-svh overflow-hidden">
      <div className="absolute inset-0 isolate">
        <img src={foto} alt="" className="absolute inset-0 size-full object-cover object-[50%_85%]" />
        <InkReveal maskColor={FUNDO_CLARO} brushSize={150} lifetime={900} />
      </div>

      <div className="pointer-events-none relative flex min-h-svh flex-col px-4 sm:px-8">
        <header className="flex h-20 items-center">
          <span className="pointer-events-auto rounded-full bg-(--l-fundo-2)/85 px-4 py-2 backdrop-blur">
            <Voltar />
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-6">
          <div className="pointer-events-auto w-full max-w-[420px] rounded-3xl border border-(--l-linha) bg-(--l-fundo-2)/90 px-6 py-10 shadow-(--l-sombra) backdrop-blur-md sm:px-10">
            <img src="/fatec-icon.svg" alt="FATECalçados" className="mb-8 h-8 w-auto" />
            <Formulario {...props} />
          </div>
        </main>

        <div className="flex h-16 items-center justify-center">
          <p className="rounded-full bg-(--l-fundo-2)/85 px-4 py-1.5 text-center text-[13px] text-(--l-texto-2) backdrop-blur">
            Passe o mouse (ou o dedo) pelo fundo: tem tênis escondido aí.
          </p>
        </div>
      </div>
    </div>
  );
}

// Lado esquerdo: sem foto, só tipografia e os três níveis do programa (espelham regras.py).
function PainelMarca() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--l-painel-de)_0%,var(--l-painel-meio)_55%,var(--l-fundo)_100%)] p-12 md:flex">
      <span className="inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-[-.02em]">
        <img src="/fatec-icon.svg" alt="" className="h-7 w-auto" />
        FATECalçados
      </span>

      <div>
        <p className="text-[clamp(2.5rem,4.2vw,3.5rem)] leading-[1] font-semibold tracking-[-.04em] text-balance text-(--l-texto)/85">
          Cada passo vira <span className="landing-degrade">ponto.</span>
        </p>
        <ul className="mt-10 flex gap-8 border-t border-(--l-linha) pt-6 text-[13px] text-(--l-texto-2)">
          <li>
            <span className="block text-[15px] font-medium text-(--l-bronze)">Bronze</span>0%
          </li>
          <li>
            <span className="block text-[15px] font-medium text-(--l-prata)">Prata</span>+10%
          </li>
          <li>
            <span className="block text-[15px] font-medium text-(--l-ouro)">Ouro</span>+20%
          </li>
        </ul>
      </div>
    </aside>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { rotulo: string };

const inputClass =
  "w-full rounded-xl border border-(--l-linha) bg-(--l-fundo) px-4 py-3 text-[15px] text-(--l-texto) " +
  "placeholder:text-(--l-texto-2)/70 focus:border-(--l-vinho-claro) focus:outline-none";

export function Campo({ rotulo, type, ...props }: CampoProps) {
  const [visivel, setVisivel] = useState(false);
  const senha = type === "password";

  return (
    <label className="flex flex-col gap-2 text-[14px]">
      {rotulo}
      <span className="relative">
        <input {...props} type={senha && visivel ? "text" : type} className={`${inputClass} ${senha ? "pr-12" : ""}`} />
        {senha && (
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-(--l-texto-2) transition-colors hover:text-(--l-texto)"
          >
            {visivel ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        )}
      </span>
    </label>
  );
}

export function LembrarDeMim() {
  return (
    <label className="flex items-center gap-2.5 text-[14px] text-(--l-texto-2)">
      <input type="checkbox" name="lembrar" className="size-4 accent-(--l-vinho-claro)" />
      Lembrar de mim
    </label>
  );
}

export const linkRodape = "font-medium text-(--l-texto) underline underline-offset-4";
