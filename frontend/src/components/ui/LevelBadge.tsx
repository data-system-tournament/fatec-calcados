import { corDoNivel } from "./corDoNivel";

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full border border-line-2 py-px pr-2 pl-[7px] text-xs font-medium text-ink-2">
      <span className={`size-1.5 rounded-full ${corDoNivel(level)}`} />
      {level}
    </span>
  );
}
