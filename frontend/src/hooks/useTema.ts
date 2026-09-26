import { useEffect, useState } from "react";

export type Tema = "sistema" | "claro" | "escuro";

const STORAGE_KEY = "fatec:tema";
const ESCURO_QUERY = "(prefers-color-scheme: dark)";

function lerSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo === "claro" || salvo === "escuro" ? salvo : "sistema";
  } catch {
    return "sistema";
  }
}

// Feito com IA: tema claro/escuro escolhido dentro do site. "sistema" tira o data-theme e deixa o
// prefers-color-scheme do index.css decidir; "claro"/"escuro" fixam o data-theme no <html>, que os tokens
// do index.css já respeitam. A escolha fica em localStorage (`fatec:tema`) e o index.html a aplica antes do
// primeiro paint, para a página não piscar no tema errado.
export function useTema() {
  const [tema, setTema] = useState<Tema>(lerSalvo);
  const [sistemaEscuro, setSistemaEscuro] = useState(() => window.matchMedia(ESCURO_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(ESCURO_QUERY);
    const aoMudar = () => setSistemaEscuro(query.matches);
    query.addEventListener("change", aoMudar);
    return () => query.removeEventListener("change", aoMudar);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") delete raiz.dataset.theme;
    else raiz.dataset.theme = tema === "claro" ? "light" : "dark";

    try {
      if (tema === "sistema") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      // Sem localStorage (modo privado, por exemplo): o tema só não fica salvo.
    }
  }, [tema]);

  // O tema que está na tela agora (com "sistema", depende do sistema operacional).
  const escuro = tema === "escuro" || (tema === "sistema" && sistemaEscuro);

  return { tema, setTema, escuro };
}
