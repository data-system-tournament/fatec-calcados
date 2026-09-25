import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, footer, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Feito com IA: guardado durante a renderização, antes de qualquer autoFocus mexer no foco,
  // para devolver o foco a quem abriu o modal quando ele fechar.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Um filho com autoFocus (ex.: "Nova venda") já ficou com o foco: não tira dele.
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [opener]);

  // Feito com IA: o Tab fica preso dentro do modal (o fundo continua na tela, mas não é alcançável
  // pelo teclado), e o Escape só é tratado aqui, sem ouvir a janela inteira.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(9,9,11,.4)] p-4 backdrop-blur-[2px]"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="max-h-[90vh] w-[min(440px,100%)] animate-pop overflow-auto rounded-xl border border-line bg-surface shadow-pop outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-5 pt-[18px]">
          <h3 className="text-base font-semibold tracking-[-.01em]">{title}</h3>
          <button
            className="grid size-7 place-items-center rounded-md text-muted hover:bg-subtle hover:text-ink"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-3.5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-bg px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
