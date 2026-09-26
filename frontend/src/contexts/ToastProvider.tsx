import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Toast } from "../components/ui/Toast";
import { ToastContext } from "./toast";

const TOAST_DURATION_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);

  const notify = useCallback((message: string) => {
    setToast({ id: crypto.randomUUID(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && <Toast key={toast.id} message={toast.message} />}
      {/* Feito com IA: região viva montada desde o início. Leitores de tela costumam ignorar uma região
          role="status" que já nasce com texto, então o aviso é escrito aqui dentro, e não num elemento novo. */}
      <div role="status" className="sr-only">{toast?.message}</div>
    </ToastContext.Provider>
  );
}
