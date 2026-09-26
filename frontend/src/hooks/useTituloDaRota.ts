import { useEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router-dom";

const TITULO_DO_SITE = "FATECalçados";

// Feito com IA: numa SPA o navegador não avisa que a tela mudou. A cada troca de rota o título da aba
// passa a ser o da tela e o foco vai para o <h1> do cabeçalho, que o leitor de tela lê em voz alta
// (e o próximo Tab segue a partir do conteúdo, não da sidebar). Na primeira carga o foco fica onde está.
// Só o pathname conta: filtros e página na URL (?pagina=2) não tiram o foco do controle que os mudou.
export function useTituloDaRota(titulo: string, tituloRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  // Guarda o pathname anterior (e não um "já montou"): o StrictMode roda o efeito duas vezes na montagem.
  const anterior = useRef(pathname);

  useEffect(() => {
    const original = document.title;
    return () => {
      document.title = original;
    };
  }, []);

  useEffect(() => {
    document.title = titulo ? `${titulo} · ${TITULO_DO_SITE}` : TITULO_DO_SITE;
  }, [titulo]);

  useEffect(() => {
    if (anterior.current === pathname) return;
    anterior.current = pathname;
    // Um campo com autoFocus na tela nova já pegou o foco: não tira dele.
    const main = document.getElementById("conteudo");
    if (main?.contains(document.activeElement)) return;
    // Sem título (ex.: página não encontrada), o foco vai para o próprio conteúdo.
    (tituloRef.current ?? main)?.focus({ preventScroll: true });
  }, [pathname, tituloRef]);
}
