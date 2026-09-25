import { createContext, useContext } from "react";

export const ToastContext = createContext<(message: string) => void>(() => {});

// notify("texto") mostra a mensagem no rodapé por alguns segundos.
export function useToast() {
  return useContext(ToastContext);
}
