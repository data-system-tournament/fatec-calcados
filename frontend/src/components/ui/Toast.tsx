import { Check } from "lucide-react";

export function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] flex max-w-[calc(100%-32px)] -translate-x-1/2 animate-pop items-center gap-2.5 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-surface shadow-pop"
      role="status"
    >
      <Check size={15} className="flex-none text-ok" />
      {message}
    </div>
  );
}
