import { useEffect } from "react";

// Feito com IA: no modo escuro o PDF sairia com fundo quase preto, que gasta tinta e fica ruim de ler.
// Durante a impressão (pelo botão ou pelo Ctrl+P) o <html> ganha data-theme="light", que desliga os
// tokens escuros de index.css; ao fechar a janela de impressão o valor anterior volta.
export function useTemaClaroAoImprimir() {
  useEffect(() => {
    const raiz = document.documentElement;
    let imprimindo = false;
    let anterior: string | null = null;

    function antes() {
      imprimindo = true;
      anterior = raiz.getAttribute("data-theme");
      raiz.setAttribute("data-theme", "light");
    }

    function depois() {
      if (!imprimindo) return;
      imprimindo = false;
      if (anterior === null) raiz.removeAttribute("data-theme");
      else raiz.setAttribute("data-theme", anterior);
    }

    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", depois);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", depois);
      depois();
    };
  }, []);
}
