const DOT_COLORS: Record<string, string> = {
  bronze: "bg-bronze",
  prata: "bg-prata",
  ouro: "bg-accent",
};

// A cor de cada nível (bolinha do selo e barras dos gráficos).
export function corDoNivel(level: string): string {
  return DOT_COLORS[level.toLowerCase()] ?? "bg-faint";
}
