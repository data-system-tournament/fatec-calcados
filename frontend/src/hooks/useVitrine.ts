import { useEffect, useState } from "react";

// Feito com IA: estado da vitrine rotativa da landing. Guarda o item atual e o anterior (que ainda está
// saindo da tela) e troca sozinho a cada `duracao` ms. A ordem é sorteada a cada visita, mas o primeiro
// item fica fixo (é o que abre a página). Com movimento reduzido a vitrine não troca sozinha e fica no
// primeiro item.
export function useVitrine(total: number, duracao: number) {
  const [ordem] = useState(() => [0, ...embaralhar(Array.from({ length: total - 1 }, (_, i) => i + 1))]);
  const [posicao, setPosicao] = useState(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  const [reduzido] = useState(movimentoReduzido);

  useEffect(() => {
    if (reduzido) return;
    const espera = window.setTimeout(() => {
      setAnterior(ordem[posicao]);
      setPosicao((posicao + 1) % total);
    }, duracao);
    return () => window.clearTimeout(espera);
  }, [reduzido, posicao, ordem, total, duracao]);

  return { ordem, posicao, atual: ordem[posicao], anterior };
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function movimentoReduzido() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.movimento === "reduzido"
  );
}
