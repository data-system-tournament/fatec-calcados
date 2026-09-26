import { BellOff, Cake, Hourglass, Star, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import { createElement } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../../components/ui/Modal";
import { hintClass } from "../../components/ui/styles";
import { TONS, type Tom } from "../dashboard/tons";
import type { Notificacao, TipoDeNotificacao } from "./notificacoes";

// Ícone e cor de cada tipo, com o significado das cores do dashboard (âmbar = vencimento, azul = pontos).
const VISUAL: Record<TipoDeNotificacao, { icone: LucideIcon; tom: Tom }> = {
  aniversario: { icone: Cake, tom: "rosa" },
  vencendo: { icone: Hourglass, tom: "ambar" },
  avaliar: { icone: Star, tom: "esmeralda" },
  nivel: { icone: TrendingUp, tom: "azul" },
  perfil: { icone: UserRound, tom: "violeta" },
};

// Lista de notificações aberta pelo sino da sidebar. `novas` são as que ainda não tinham sido vistas quando
// o painel abriu (ganham um ponto); cada aviso é um link para a tela onde o cliente resolve o assunto.
export function PainelNotificacoes({ notificacoes, novas, onClose }: {
  notificacoes: Notificacao[];
  novas: string[];
  onClose: () => void;
}) {
  return (
    <Modal title="Notificações" onClose={onClose}>
      {notificacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <BellOff size={26} className="text-faint" aria-hidden />
          <p className={hintClass}>Nada de novo por aqui. Avisamos quando tiver pontos vencendo ou algo para avaliar.</p>
        </div>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {notificacoes.map((n) => {
            const { icone, tom } = VISUAL[n.tipo];
            const nova = novas.includes(n.id);
            return (
              <li key={n.id}>
                <Link to={n.link} onClick={onClose} className="flex gap-3 rounded-lg px-2 py-3 hover:bg-subtle">
                  <span className={`grid size-9 flex-none place-items-center rounded-full ${TONS[tom].chip}`} aria-hidden>
                    {createElement(icone, { size: 17, strokeWidth: 1.7 })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13.5px] font-medium">
                      {n.titulo}
                      {nova && (
                        <>
                          <span className="size-2 flex-none rounded-full bg-accent-ink" aria-hidden />
                          <span className="sr-only">(nova)</span>
                        </>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{n.texto}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
