import type { ReactNode } from "react";

const tones = {
  default: "border-line-2 bg-surface text-muted",
  onDark: "border-ink-2 bg-transparent text-faint",
};

export function Kbd({ children, tone = "default", className = "" }: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <kbd className={`rounded border border-b-2 px-[5px] py-px font-sans text-[11px] font-medium ${tones[tone]} ${className}`}>
      {children}
    </kbd>
  );
}
