import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";

// Moldura comum de /login e /cadastro: cartão dividido, painel da marca à esquerda e formulário
// à direita. Mesma paleta preta e cinza da landing (classe .landing).

type TelaAcessoProps = {
  titulo: string;
  subtitulo: string;
  botao: string;
  onSubmit: () => void;
  rodape: ReactNode;
  children: ReactNode;
};

export function TelaAcesso({ titulo, subtitulo, botao, onSubmit, rodape, children }: TelaAcessoProps) {
  function enviar(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="landing flex min-h-svh flex-col px-4 sm:px-8">
      <header className="flex h-20 items-center">
        <Link to="/" className="inline-flex items-center gap-2 text-[14px] text-(--l-text-dark) transition-colors hover:text-(--l-white)">
          <ArrowLeft size={16} aria-hidden /> Voltar
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-6">
        <div className="grid w-full max-w-[1020px] overflow-hidden rounded-3xl border border-(--l-line-dark) bg-(--l-black-2) md:min-h-[600px] md:grid-cols-[1fr_1.1fr]">
          <PainelMarca />

          <div className="flex items-center px-6 py-12 sm:px-14">
            <div className="w-full">
              <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-.03em]">{titulo}</h1>
              <p className="mt-2 text-[15px] text-(--l-text-dark)">{subtitulo}</p>

              <form noValidate onSubmit={enviar} className="mt-9 flex flex-col gap-5">
                {children}
                <button
                  type="submit"
                  className="mt-2 rounded-xl bg-(--l-white) py-3.5 text-[15px] font-medium text-(--l-black) transition-colors hover:bg-white"
                >
                  {botao}
                </button>
              </form>

              <p className="mt-7 text-[14px] text-(--l-text-dark)">{rodape}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex h-16 items-center justify-end text-[13px] text-(--l-text-dark)">
        © 2026 FATECalçados · Desafio de Inovação Data System
      </footer>
    </div>
  );
}

// Lado esquerdo: sem foto, só tipografia e os três níveis do programa (espelham regras.py).
function PainelMarca() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#2a2a2e_0%,#151517_55%,#0b0b0c_100%)] p-12 md:flex">
      <span className="text-[17px] font-semibold tracking-[-.02em]">FATECalçados</span>

      <div>
        <p className="text-[clamp(2.5rem,4.2vw,3.5rem)] leading-[1] font-semibold tracking-[-.04em] text-balance text-(--l-white)/85">
          Cada passo vira ponto.
        </p>
        <ul className="mt-10 flex gap-8 border-t border-white/10 pt-6 text-[13px] text-(--l-text-dark)">
          <li>
            <span className="block text-[15px] font-medium text-(--l-white)">Bronze</span>0%
          </li>
          <li>
            <span className="block text-[15px] font-medium text-(--l-white)">Prata</span>+10%
          </li>
          <li>
            <span className="block text-[15px] font-medium text-(--l-white)">Ouro</span>+20%
          </li>
        </ul>
      </div>
    </aside>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { rotulo: string };

const inputClass =
  "w-full rounded-xl border border-(--l-line-dark) bg-(--l-black) px-4 py-3 text-[15px] text-(--l-white) " +
  "placeholder:text-(--l-text-dark)/70 focus:border-(--l-text-dark) focus:outline-none";

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
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-(--l-text-dark) transition-colors hover:text-(--l-white)"
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
    <label className="flex items-center gap-2.5 text-[14px] text-(--l-text-dark)">
      <input type="checkbox" name="lembrar" className="size-4 accent-(--l-white)" />
      Lembrar de mim
    </label>
  );
}

export const linkRodape = "font-medium text-(--l-white) underline underline-offset-4";
