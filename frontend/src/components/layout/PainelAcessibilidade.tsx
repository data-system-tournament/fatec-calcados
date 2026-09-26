import { useId, type ReactNode } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useAcessibilidade, type Acessibilidade, type TamanhoFonte } from "../../hooks/useAcessibilidade";
import { useTema, type Tema } from "../../hooks/useTema";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

// Miniatura de cada tema: um cartãozinho com as cores de fundo, superfície e texto daquele tema. As cores
// ficam fixas de propósito (mostram o tema, não seguem o atual); "sistema" mostra metade de cada.
const TEMAS: { valor: Tema; rotulo: string; icone: LucideIcon; amostra: string }[] = [
  { valor: "sistema", rotulo: "Sistema", icone: Monitor, amostra: "bg-[linear-gradient(135deg,#F7F7F8_50%,#0F1012_50%)]" },
  { valor: "claro", rotulo: "Claro", icone: Sun, amostra: "bg-[#F7F7F8]" },
  { valor: "escuro", rotulo: "Escuro", icone: Moon, amostra: "bg-[#0F1012]" },
];

const TAMANHOS: { valor: TamanhoFonte; rotulo: string; amostra: string }[] = [
  { valor: "normal", rotulo: "Normal", amostra: "text-[13px]" },
  { valor: "grande", rotulo: "Grande", amostra: "text-[17px]" },
  { valor: "muito-grande", rotulo: "Muito grande", amostra: "text-[22px]" },
];

type Chave = Exclude<keyof Acessibilidade, "fonte">;

const OPCOES: { chave: Chave; rotulo: string; descricao: string }[] = [
  { chave: "contrasteAlto", rotulo: "Alto contraste", descricao: "Textos e bordas mais escuros, contorno de foco mais grosso." },
  { chave: "espacamentoAmplo", rotulo: "Espaçamento de texto", descricao: "Mais espaço entre linhas, letras e palavras." },
  { chave: "reduzirMovimento", rotulo: "Reduzir animações", descricao: "Desliga transições e efeitos de entrada." },
  { chave: "sublinharLinks", rotulo: "Sublinhar links", descricao: "Deixa os links do conteúdo sempre sublinhados." },
];

// Escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas classes em conflito vence.
// Tema e tamanho usam o mesmo cartão: borda fina, e a escolhida ganha contorno na cor do texto.
const cartaoBase =
  "flex cursor-pointer flex-col gap-2 rounded-lg border p-2 transition-colors " +
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-app";
const cartaoAtivo = `${cartaoBase} border-ink bg-surface text-ink ring-1 ring-ink`;
const cartaoInativo = `${cartaoBase} border-line bg-surface text-muted hover:border-line-2 hover:text-ink`;

// Interruptor desenhado sobre o checkbox nativo (appearance-none), que continua sendo o controle real.
const interruptor =
  "relative mt-0.5 h-5 w-9 flex-none cursor-pointer appearance-none rounded-full bg-line-2 transition-colors " +
  "before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-surface before:shadow-card " +
  "before:transition-transform checked:bg-ink checked:before:translate-x-4";

// Feito com IA: painel único de aparência e acessibilidade (tema, tamanho da letra e opções), para a sidebar
// ter uma entrada só em vez de dois controles com visuais diferentes. Usa controles nativos (rádios e
// checkboxes com <label>), que leitores de tela e teclado já entendem, estilizados por cima; cada mudança
// vale na hora e fica salva neste navegador.
export function PainelAcessibilidade({ onClose }: { onClose: () => void }) {
  const { opcoes, mudar, restaurar } = useAcessibilidade();
  const { tema, setTema } = useTema();
  const id = useId();

  function restaurarTudo() {
    restaurar();
    setTema("sistema");
  }

  const footer = (
    <>
      <Button onClick={restaurarTudo}>Restaurar padrão</Button>
      <Button variant="dark" onClick={onClose}>Concluir</Button>
    </>
  );

  return (
    <Modal title="Aparência e acessibilidade" onClose={onClose} footer={footer}>
      <Secao titulo="Tema">
        <div className="grid grid-cols-3 gap-2">
          {TEMAS.map(({ valor, rotulo, icone: Icone, amostra }) => (
            <label key={valor} className={tema === valor ? cartaoAtivo : cartaoInativo}>
              <input
                type="radio"
                name={`${id}-tema`}
                value={valor}
                checked={tema === valor}
                onChange={() => setTema(valor)}
                className="sr-only"
              />
              <span aria-hidden="true" className={`flex h-11 items-end rounded-md border border-line p-1.5 ${amostra}`}>
                <span className="h-1.5 w-2/3 rounded-full bg-[#A1A1AA]/60" />
              </span>
              <span className="flex items-center gap-1.5 px-0.5 text-xs font-medium">
                <Icone size={13} strokeWidth={1.75} aria-hidden="true" />
                {rotulo}
              </span>
            </label>
          ))}
        </div>
      </Secao>

      <Secao titulo="Tamanho da letra">
        <div className="grid grid-cols-3 gap-2">
          {TAMANHOS.map((tamanho) => (
            <label key={tamanho.valor} className={opcoes.fonte === tamanho.valor ? cartaoAtivo : cartaoInativo}>
              <input
                type="radio"
                name={`${id}-fonte`}
                value={tamanho.valor}
                checked={opcoes.fonte === tamanho.valor}
                onChange={() => mudar("fonte", tamanho.valor)}
                className="sr-only"
              />
              <span aria-hidden="true" className={`grid h-11 place-items-center rounded-md bg-subtle font-semibold text-ink ${tamanho.amostra}`}>
                Aa
              </span>
              <span className="px-0.5 text-xs font-medium">{tamanho.rotulo}</span>
            </label>
          ))}
        </div>
      </Secao>

      <Secao titulo="Leitura e movimento">
        <ul className="flex flex-col divide-y divide-line">
          {OPCOES.map((opcao) => (
            <li key={opcao.chave}>
              <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
                <span>
                  <span className="block text-[13px] font-medium">{opcao.rotulo}</span>
                  <span className="block text-xs text-muted">{opcao.descricao}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={opcoes[opcao.chave]}
                  onChange={(event) => mudar(opcao.chave, event.target.checked)}
                  className={interruptor}
                />
              </label>
            </li>
          ))}
        </ul>
      </Secao>

      <p className="text-xs text-muted">As escolhas valem na hora e ficam salvas neste navegador.</p>
    </Modal>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{titulo}</legend>
      {children}
    </fieldset>
  );
}
