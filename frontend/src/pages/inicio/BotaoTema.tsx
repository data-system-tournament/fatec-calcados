import { Moon, Sun } from "lucide-react";
import { useTema } from "../../hooks/useTema";

// Feito com IA: troca claro/escuro nas telas de acesso (/login, /cadastro). Um clique fixa o tema oposto ao que
// está na tela; a escolha é a mesma do seletor da sidebar (`fatec:tema`), então vale para o site todo.
export function BotaoTema() {
  const { escuro, setTema } = useTema();
  const rotulo = escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro";

  return (
    <button
      type="button"
      onClick={() => setTema(escuro ? "claro" : "escuro")}
      aria-label={rotulo}
      title={rotulo}
      className="grid size-9 place-items-center rounded-full border border-(--l-linha) text-(--l-ambar) transition-colors hover:border-(--l-ambar)"
    >
      {escuro ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}
