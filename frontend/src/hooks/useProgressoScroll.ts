import { useEffect, useRef, useState } from "react";

// Feito com IA: progresso (0 a 1) de uma seção alta enquanto o conteúdo dela fica "preso" (sticky) na tela.
// 0 quando o topo da seção encosta no topo da janela, 1 quando o fim dela encosta no fim da janela.
// Com movimento reduzido devolve sempre 1 (o estado final, sem animação), a menos que o efeito seja só
// de opacidade e passe `respeitarMovimentoReduzido: false`.
export function useProgressoScroll<T extends HTMLElement>({ respeitarMovimentoReduzido = true } = {}) {
  const ref = useRef<T>(null);
  const [reduzido] = useState(() => respeitarMovimentoReduzido && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [progresso, setProgresso] = useState(reduzido ? 1 : 0);

  useEffect(() => {
    if (reduzido) return;

    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const el = ref.current;
      if (!el) return;
      const percurso = el.offsetHeight - window.innerHeight;
      const p = percurso > 0 ? -el.getBoundingClientRect().top / percurso : 1;
      setProgresso(Math.min(1, Math.max(0, p)));
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };

    agendar();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [reduzido]);

  return [ref, progresso] as const;
}
