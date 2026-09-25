import type { ReactNode } from "react";

const tones = {
  neutral: "bg-subtle text-ink-2",
  inverted: "bg-ink text-surface",
  warn: "bg-accent-soft text-accent-ink",
};

// Contadores e etiquetas pequenas (ex.: "4" na aba Ações, "offline" na aba do PDV).
export function Pill({ children, tone = "neutral", className = "" }: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span className={`rounded-full px-[7px] text-[11px] leading-[18px] font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
