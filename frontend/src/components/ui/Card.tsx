import type { HTMLAttributes } from "react";

// Sem padding de propósito: cada tela escolhe o seu (o padrão é p-[18px]).
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[10px] border border-line bg-surface shadow-card ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`mb-3.5 text-[13px] font-medium text-muted ${className}`} {...props} />;
}
