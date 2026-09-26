import { useCallback, useEffect, useState } from "react";

// Mesma chave e mesmos atributos que o script do index.html lê antes da primeira pintura.
const STORAGE_KEY = "fatec:acessibilidade";

export type TamanhoFonte = "normal" | "grande" | "muito-grande";

export type Acessibilidade = {
  fonte: TamanhoFonte;
  contrasteAlto: boolean;
  espacamentoAmplo: boolean;
  reduzirMovimento: boolean;
  sublinharLinks: boolean;
};

const PADRAO: Acessibilidade = {
  fonte: "normal",
  contrasteAlto: false,
  espacamentoAmplo: false,
  reduzirMovimento: false,
  sublinharLinks: false,
};

function ler(): Acessibilidade {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { ...PADRAO, ...salvo };
  } catch {
    return PADRAO;
  }
}

// Feito com IA: cada opção vira um atributo data-* no <html> (ver index.css); sem a opção, o atributo sai,
// e o site volta ao normal sem nenhuma regra extra.
function aplicar(opcoes: Acessibilidade) {
  const raiz = document.documentElement;
  const atributos: Record<string, string | null> = {
    "data-fonte": opcoes.fonte === "normal" ? null : opcoes.fonte,
    "data-contraste": opcoes.contrasteAlto ? "alto" : null,
    "data-espacamento": opcoes.espacamentoAmplo ? "amplo" : null,
    "data-movimento": opcoes.reduzirMovimento ? "reduzido" : null,
    "data-links": opcoes.sublinharLinks ? "sublinhados" : null,
  };
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === null) raiz.removeAttribute(nome);
    else raiz.setAttribute(nome, valor);
  }
}

export function useAcessibilidade() {
  const [opcoes, setOpcoes] = useState(ler);

  useEffect(() => {
    aplicar(opcoes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opcoes));
    } catch {
      // Sem localStorage (modo privado, por exemplo): vale só até recarregar a página.
    }
  }, [opcoes]);

  const mudar = useCallback(<K extends keyof Acessibilidade>(chave: K, valor: Acessibilidade[K]) => {
    setOpcoes((atual) => ({ ...atual, [chave]: valor }));
  }, []);

  const restaurar = useCallback(() => setOpcoes(PADRAO), []);

  return { opcoes, mudar, restaurar };
}
