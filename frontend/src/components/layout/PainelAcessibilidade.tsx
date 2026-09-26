import { useId } from "react";
import { useAcessibilidade, type Acessibilidade, type TamanhoFonte } from "../../hooks/useAcessibilidade";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

const TAMANHOS: { valor: TamanhoFonte; rotulo: string; amostra: string }[] = [
  { valor: "normal", rotulo: "Normal", amostra: "text-[13px]" },
  { valor: "grande", rotulo: "Grande", amostra: "text-[15px]" },
  { valor: "muito-grande", rotulo: "Muito grande", amostra: "text-[17px]" },
];

type Chave = Exclude<keyof Acessibilidade, "fonte">;

const OPCOES: { chave: Chave; rotulo: string; descricao: string }[] = [
  { chave: "contrasteAlto", rotulo: "Alto contraste", descricao: "Textos e bordas mais escuros, contorno de foco mais grosso." },
  { chave: "espacamentoAmplo", rotulo: "Espaçamento de texto", descricao: "Mais espaço entre linhas, letras e palavras." },
  { chave: "reduzirMovimento", rotulo: "Reduzir animações", descricao: "Desliga transições e efeitos de entrada." },
  { chave: "sublinharLinks", rotulo: "Sublinhar links", descricao: "Deixa os links do conteúdo sempre sublinhados." },
];

// Escolhidas por inteiro (não somadas) porque o Tailwind não garante qual de duas classes em conflito vence.
const tamanhoBase = "flex cursor-pointer flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 text-center transition-colors";
const tamanhoAtivo = `${tamanhoBase} border-ink bg-ink text-surface`;
const tamanhoInativo = `${tamanhoBase} border-line-2 bg-surface text-ink-2 hover:border-muted`;

// Feito com IA: painel de acessibilidade. Usa controles nativos (rádios e checkboxes com <label>), que leitores
// de tela e teclado já entendem, estilizados por cima; cada mudança vale na hora e fica salva neste navegador.
export function PainelAcessibilidade({ onClose }: { onClose: () => void }) {
  const { opcoes, mudar, restaurar } = useAcessibilidade();
  const id = useId();

  const footer = (
    <>
      <Button onClick={restaurar}>Restaurar padrão</Button>
      <Button variant="dark" onClick={onClose}>Concluir</Button>
    </>
  );

  return (
    <Modal title="Acessibilidade" onClose={onClose} footer={footer}>
      <fieldset className="mb-5">
        <legend className="mb-2 text-[12.5px] font-medium text-ink-2">Tamanho da letra</legend>
        <div className="grid grid-cols-3 gap-2">
          {TAMANHOS.map((tamanho) => {
            const ativo = opcoes.fonte === tamanho.valor;
            return (
              <label key={tamanho.valor} className={`${ativo ? tamanhoAtivo : tamanhoInativo} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-app`}>
                <input
                  type="radio"
                  name={`${id}-fonte`}
                  value={tamanho.valor}
                  checked={ativo}
                  onChange={() => mudar("fonte", tamanho.valor)}
                  className="sr-only"
                />
                <span aria-hidden="true" className={`${tamanho.amostra} leading-none font-semibold`}>Aa</span>
                <span className="text-xs">{tamanho.rotulo}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <ul className="flex flex-col">
        {OPCOES.map((opcao) => (
          <li key={opcao.chave} className="border-t border-line py-3 first:border-t-0 first:pt-0">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-[13px] font-medium">{opcao.rotulo}</span>
                <span className="block text-xs text-muted">{opcao.descricao}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={opcoes[opcao.chave]}
                onChange={(event) => mudar(opcao.chave, event.target.checked)}
                className="mt-0.5 size-[18px] flex-none cursor-pointer accent-(--ink)"
              />
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">As escolhas valem na hora e ficam salvas neste navegador.</p>
    </Modal>
  );
}
