import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fatec:sidebar";
const MOBILE_QUERY = "(max-width: 860px)";

function readSaved(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "fechada";
  } catch {
    return true;
  }
}

// Feito com IA: abre/fecha a sidebar. No desktop a escolha fica salva em localStorage (`fatec:sidebar`);
// no celular (<= 860px) ela é uma gaveta que sempre começa fechada e fecha ao trocar de tela,
// sem mexer na preferência do desktop.
export function useSidebar() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [openDesktop, setOpenDesktop] = useState(readSaved);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    function handleChange() {
      setMobile(query.matches);
      setOpenMobile(false);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, openDesktop ? "aberta" : "fechada");
    } catch {
      // Sem localStorage (modo privado, por exemplo): a sidebar só não lembra a escolha.
    }
  }, [openDesktop]);

  // Estáveis para poderem entrar nas dependências de um useEffect sem reexecutá-lo a cada render.
  const close = useCallback(() => setOpenMobile(false), []);
  const openDrawer = useCallback(() => setOpenMobile(true), []);

  return {
    open: mobile ? openMobile : openDesktop,
    mobile,
    toggle: () => (mobile ? setOpenMobile((v) => !v) : setOpenDesktop((v) => !v)),
    close,
    // Só a gaveta do celular: no desktop a sidebar já está na tela (aberta ou em rail).
    openDrawer,
  };
}
