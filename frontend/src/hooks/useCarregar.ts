import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

type State<T> = { data: T | null; error: string; key: string | undefined; retrying: boolean };

// Feito com IA: carrega dados da API quando `key` muda (ex.: os filtros da tela serializados) e devolve
// { data, error, loading, retry }.
// - `cancelled` descarta a resposta antiga se a chave mudar antes de ela chegar.
// - Os dados anteriores ficam na tela durante a recarga e depois de um erro (a tela decide o aviso).
// - `loading` é true enquanto a chave pedida ainda não foi carregada, ou durante um retry.
export function useCarregar<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<State<T>>({ data: null, error: "", key: undefined, retrying: false });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    loadRef.current()
      .then((data) => {
        if (!cancelled) setState({ data, error: "", key, retrying: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState((current) => ({ ...current, error: errorMessage(e), key, retrying: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  function retry() {
    setState((current) => ({ ...current, error: "", retrying: true }));
    setAttempt((n) => n + 1);
  }

  return { data: state.data, error: state.error, loading: state.retrying || state.key !== key, retry };
}
