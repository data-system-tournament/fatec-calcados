import { useEffect } from "react";

// Feito com IA: Ctrl+K (ou ⌘+K) abre a busca de qualquer tela. Sem lista de dependências, como o
// useAtalhosPdv, para o atalho sempre chamar a função da renderização atual.
export function useAtalhoBusca(onOpen: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
}
