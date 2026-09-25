import { useEffect } from "react";

// Feito com IA: atalhos F2 (busca) e F10 (finalizar). Sem lista de dependências de propósito,
// para o atalho sempre chamar as funções da renderização atual (com o carrinho atual).
export function useAtalhosPdv({ onSearch, onFinish }: { onSearch: () => void; onFinish: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        onSearch();
      }
      if (event.key === "F10") {
        event.preventDefault();
        onFinish();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
}
