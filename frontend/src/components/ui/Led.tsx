// Bolinha de status do caixa: verde online, cinza offline.
export function Led({ on, className = "" }: { on: boolean; className?: string }) {
  const color = on ? "bg-ok shadow-[0_0_0_3px_var(--ok-soft)]" : "bg-faint";
  return <i aria-hidden="true" className={`inline-block size-[7px] flex-none rounded-full ${color} ${className}`} />;
}
