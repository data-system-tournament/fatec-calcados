import { useCallback, useState } from "react";

const STORAGE_KEY = "fatec:tour";

// Sem localStorage (modo privado, por exemplo) não dá para lembrar que o tour já rodou: melhor não
// mostrá-lo do que repeti-lo a cada visita.
function jaVisto(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "visto";
  } catch {
    return true;
  }
}

function marcarComoVisto() {
  try {
    localStorage.setItem(STORAGE_KEY, "visto");
  } catch {
    // Ver jaVisto: sem localStorage o tour simplesmente não abre sozinho.
  }
}

// Feito com IA: estado do tour guiado da sidebar. Abre sozinho na primeira visita às telas do sistema
// (`fatec:tour`) e pode ser reaberto pelo botão da sidebar. Terminar ou pular contam como "visto".
export function useTour(totalPassos: number) {
  const [ativo, setAtivo] = useState(() => !jaVisto());
  const [passo, setPasso] = useState(0);

  const encerrar = useCallback(() => {
    marcarComoVisto();
    setAtivo(false);
  }, []);

  const iniciar = useCallback(() => {
    setPasso(0);
    setAtivo(true);
  }, []);

  const proximo = useCallback(() => {
    if (passo >= totalPassos - 1) encerrar();
    else setPasso(passo + 1);
  }, [passo, totalPassos, encerrar]);

  const anterior = useCallback(() => setPasso((atual) => Math.max(0, atual - 1)), []);

  return { ativo, passo, iniciar, proximo, anterior, encerrar };
}
