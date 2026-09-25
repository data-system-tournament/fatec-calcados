import { useCallback, useEffect, useState, type ReactNode } from "react";
import { fetchActions } from "../services/api";
import type { Action } from "../types";
import { AcoesContext, type AcoesValue } from "./acoes";

export function AcoesProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>([]);
  const [status, setStatus] = useState<AcoesValue["status"]>("loading");
  const [error, setError] = useState("");
  const [doneTypes, setDoneTypes] = useState<string[]>([]);

  // Uma falha não apaga as listas já carregadas: a tela mostra o erro junto com os dados antigos.
  const loadActions = useCallback(() => {
    fetchActions()
      .then((loaded) => {
        setActions(loaded);
        setError("");
        setStatus("ready");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("error");
      });
  }, []);

  useEffect(loadActions, [loadActions]);

  function retry() {
    setStatus("loading");
    loadActions();
  }

  function markDone(type: string) {
    setDoneTypes((types) => [...types, type]);
  }

  const openCount = actions.filter((a) => a.clients.length > 0 && !doneTypes.includes(a.type)).length;

  return (
    <AcoesContext.Provider value={{ actions, status, error, doneTypes, loadActions, retry, markDone, openCount }}>
      {children}
    </AcoesContext.Provider>
  );
}
