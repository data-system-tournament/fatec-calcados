import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ErrorState } from "../components/ui/ErrorState";
import { hintClass } from "../components/ui/styles";
import { errorMessage, fetchStaff, staffSignOut } from "../services/api";
import type { StaffUser } from "../types";
import { EquipeContext } from "./equipe";

type Estado = { carregando: true } | { carregando: false; user: StaffUser | null; erro: string };

// Feito com IA: porteiro da área /admin. Confere a sessão da equipe ANTES de montar o resto (caixa, ações),
// para nenhuma tela chamar a API sem login. Sem sessão, manda para /admin/entrar lembrando a tela pedida
// (`state.de`), para voltar a ela depois de entrar.
export function EquipeProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const [estado, setEstado] = useState<Estado>({ carregando: true });

  const carregar = useCallback(() => {
    fetchStaff()
      .then((user) => setEstado({ carregando: false, user, erro: "" }))
      .catch((e: unknown) => setEstado({ carregando: false, user: null, erro: errorMessage(e) }));
  }, []);

  useEffect(carregar, [carregar]);

  const signOut = useCallback(async () => {
    await staffSignOut().catch(() => {});
    setEstado({ carregando: false, user: null, erro: "" });
  }, []);

  if (estado.carregando) {
    return <p className={`${hintClass} p-6`} role="status">Conferindo o acesso...</p>;
  }
  if (estado.erro) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <ErrorState title="Não foi possível conferir o acesso" message={estado.erro} onRetry={carregar} />
      </div>
    );
  }
  if (!estado.user) return <Navigate to="/admin/entrar" replace state={{ de: pathname + search }} />;

  return <EquipeContext.Provider value={{ user: estado.user, signOut }}>{children}</EquipeContext.Provider>;
}
