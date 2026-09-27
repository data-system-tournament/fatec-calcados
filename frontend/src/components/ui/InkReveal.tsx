import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from "react";

// Feito com IA: componente InkReveal (21st.dev), adaptado ao projeto. Um canvas pintado com a cor do fundo
// cobre o que estiver atrás dele (uma foto, no /login e /cadastro) e o ponteiro abre "manchas de tinta" que
// crescem e somem, revelando o que está embaixo. Mudanças em relação ao original: sem "use client" (não é
// Next.js); eventos de ponteiro em vez de mouse, para funcionar também no toque; os valores padrão de lista
// ficam em constantes, porque um array novo a cada render recriaria os callbacks e repintaria o canvas a cada
// tecla digitada no formulário; useLayoutEffect para cobrir a foto antes do primeiro paint; e o canvas
// acompanha o tamanho do pai com ResizeObserver (o pai cresce quando o formulário cresce, não só a janela).

type Rgb = [number, number, number];
type Trio = [number, number, number];

type InkRevealProps = {
  /** Cor RGB da máscara, igual ao fundo da página. */
  maskColor?: Rgb;
  /** Raio de cada carimbo, em px. */
  brushSize?: number;
  /** Quanto tempo cada carimbo vive antes de sumir (ms). */
  lifetime?: number;
  /** Raio inicial, antes de o carimbo crescer. */
  rStart?: number;
  /** Variação aleatória do raio (0–1). */
  rVary?: number;
  /** Distância mínima entre carimbos ao longo do traço (px). */
  stampStep?: number;
  /** Máximo de carimbos vivos (os mais velhos saem primeiro). */
  maxStamps?: number;
  /** Segmentos do contorno ondulado (mais = mais liso). */
  segments?: number;
  /** Pesos da ondulação [primária, secundária, terciária]. */
  wobble?: Trio;
  /** Raio interno do degradê (0–1, relativo ao raio do carimbo). */
  gradientInnerRadius?: number;
  /** Opacidades do degradê [centro, meio, borda]. */
  gradientStops?: Trio;
  className?: string;
  style?: CSSProperties;
};

type Stamp = { x: number; y: number; born: number; seed: number; rmax: number };

const MASCARA_PADRAO: Rgb = [252, 250, 248];
const WOBBLE_PADRAO: Trio = [0.14, 0.08, 0.05];
const DEGRADE_PADRAO: Trio = [0.95, 0.88, 0];

export default function InkReveal({
  maskColor = MASCARA_PADRAO,
  brushSize = 128,
  lifetime = 600,
  rStart = 10,
  rVary = 0.45,
  stampStep = 10,
  maxStamps = 200,
  segments = 36,
  wobble = WOBBLE_PADRAO,
  gradientInnerRadius = 0.2,
  gradientStops = DEGRADE_PADRAO,
  className,
  style,
}: InkRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampsRef = useRef<Stamp[]>([]);
  const runningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const [r, g, b] = maskColor;
  const corDaMascara = `rgb(${r},${g},${b})`;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = parent.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    dimsRef.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = corDaMascara;
    ctx.fillRect(0, 0, w, h);
  }, [corDaMascara]);

  const carveInk = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, seed: number, alpha: number) => {
      const degrade = ctx.createRadialGradient(x, y, raio * gradientInnerRadius, x, y, raio);
      degrade.addColorStop(0, `rgba(0,0,0,${gradientStops[0] * alpha})`);
      degrade.addColorStop(0.5, `rgba(0,0,0,${gradientStops[1] * alpha})`);
      degrade.addColorStop(1, `rgba(0,0,0,${gradientStops[2] * alpha})`);
      ctx.fillStyle = degrade;

      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const wob =
          0.78 +
          wobble[0] * Math.sin(a * 3 + seed) +
          wobble[1] * Math.sin(a * 5 + seed * 2.1) +
          wobble[2] * Math.sin(a * 7 + seed * 0.7);
        const px = x + Math.cos(a) * raio * wob;
        const py = y + Math.sin(a) * raio * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    },
    [segments, wobble, gradientInnerRadius, gradientStops],
  );

  const addStamp = useCallback(
    (x: number, y: number) => {
      const stamps = stampsRef.current;
      if (stamps.length >= maxStamps) stamps.shift();
      stamps.push({
        x,
        y,
        born: performance.now(),
        seed: Math.random() * Math.PI * 2,
        rmax: brushSize * (1 - rVary + Math.random() * rVary),
      });
    },
    [brushSize, rVary, maxStamps],
  );

  const stampAlong = useCallback(
    (x: number, y: number) => {
      const last = lastPosRef.current;
      if (!last) {
        addStamp(x, y);
      } else {
        const dx = x - last.x;
        const dy = y - last.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / stampStep));
        for (let i = 1; i <= steps; i++) addStamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
      }
      lastPosRef.current = { x, y };
    },
    [addStamp, stampStep],
  );

  const loop = useCallback(function passo() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      runningRef.current = false;
      return;
    }
    const { w, h } = dimsRef.current;
    const now = performance.now();
    const stamps = stampsRef.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = corDaMascara;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";

    for (let i = stamps.length - 1; i >= 0; i--) {
      const t = (now - stamps[i].born) / lifetime;
      if (t >= 1) {
        stamps.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - t, 3);
      const raio = rStart + (stamps[i].rmax - rStart) * ease;
      carveInk(ctx, stamps[i].x, stamps[i].y, raio, stamps[i].seed, 1 - t * t);
    }

    if (stamps.length) requestAnimationFrame(passo);
    else runningRef.current = false;
  }, [carveInk, corDaMascara, lifetime, rStart]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    requestAnimationFrame(loop);
  }, [loop]);

  useLayoutEffect(() => {
    resize();
    const parent = canvasRef.current?.parentElement;
    if (!parent) return undefined;
    const observador = new ResizeObserver(resize);
    observador.observe(parent);
    return () => observador.disconnect();
  }, [resize]);

  // Ao desmontar, o laço para sozinho no próximo quadro (o canvas some e o getContext falha).
  useEffect(() => () => void (stampsRef.current = []), []);

  const posicao = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const aoMover = (e: PointerEvent<HTMLCanvasElement>) => {
    const pos = posicao(e);
    stampAlong(pos.x, pos.y);
    startLoop();
  };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, zIndex: 1, touchAction: "pan-y", ...style }}
      onPointerEnter={(e) => {
        lastPosRef.current = posicao(e);
        aoMover(e);
      }}
      onPointerMove={aoMover}
      onPointerDown={aoMover}
      onPointerLeave={() => {
        lastPosRef.current = null;
      }}
    />
  );
}
