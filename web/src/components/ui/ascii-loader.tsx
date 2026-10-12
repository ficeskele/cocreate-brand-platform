// Canvas2D dither loader ("creation of adam" recipe). Reusable: all params are props.
// Source image is sampled into a grid of cells; each cell is inked with an ordered
// (Bayer 4×4) dither of its contrast-adjusted luminance. "pulse" animates the threshold.
import * as React from "react";
import { cn } from "@/lib/utils";

export interface AsciiLoaderProps {
  src: string;
  renderMode?: "dither";
  cellSize?: number;      // px per cell
  contrast?: number;      // 100 = neutral
  density?: number;       // 0–100, extra ink weight added to darkness
  coverage?: number;      // 0–100, % of the frame the effect occupies (centered)
  bgMode?: "none" | "solid";
  animated?: boolean;
  animation?: "pulse";
  animSpeed?: number;     // 100 = 1 cycle / ~1.6s
  animIntensity?: number; // 0–100, threshold swing
  ink?: string;
  paper?: string;
  /** ms before fading out; set 0 to stay. */
  duration?: number;
  fadeMs?: number;        // fade-out length once finished
  /** Minimum width/height of the shown crop; narrower frames crop to center. */
  minAspect?: number;
  title?: string;
  subtitle?: string;
  onDone?: () => void;
  className?: string;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

export function AsciiLoader({
  src, cellSize = 9, contrast = 158, density = 20, coverage = 100, bgMode = "none",
  animated = true, animSpeed = 100, animIntensity = 60, ink = "#FFFFFF", paper = "#000000",
  duration = 1900, fadeMs = 350, minAspect = 1.1, title, subtitle, onDone, className,
}: AsciiLoaderProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = React.useState(false);
  const done = React.useRef(false);
  const reduced = React.useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const finish = React.useCallback(() => {
    if (done.current) return; done.current = true;
    setLeaving(true);
    window.setTimeout(() => onDone?.(), reduced ? 0 : fadeMs);
  }, [onDone, reduced, fadeMs]);

  React.useEffect(() => {
    if (!duration) return;
    const t = window.setTimeout(finish, reduced ? Math.min(duration, 800) : duration);
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", skip); };
  }, [duration, finish, reduced]);

  React.useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let frame = 0; let lum: Float32Array | null = null; let cols = 0, rows = 0, ox = 0, oy = 0;
    const img = new Image(); img.src = src;

    const sample = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = W * coverage / 100, ch = H * coverage / 100;
      // contain the image inside the covered area
      // on narrow frames crop the source to its center (the fingertips) instead of shrinking it
      const sw = Math.min(img.width, img.height * Math.max(cw / ch, minAspect)), sx = (img.width - sw) / 2;
      const s = Math.min(cw / sw, ch / img.height);
      const iw = sw * s, ih = img.height * s;
      cols = Math.max(1, Math.floor(iw / cellSize)); rows = Math.max(1, Math.floor(ih / cellSize));
      ox = (W - cols * cellSize) / 2; oy = (H - rows * cellSize) / 2;
      const off = document.createElement("canvas"); off.width = cols; off.height = rows;
      const o = off.getContext("2d")!; o.drawImage(img, sx, 0, sw, img.height, 0, 0, cols, rows);
      const d = o.getImageData(0, 0, cols, rows).data; lum = new Float32Array(cols * rows);
      const k = contrast / 100;
      // auto-levels: map the 5th–95th luminance percentiles to 0–1 so a light ground stays clear
      const all: number[] = []; for (let i = 0; i < cols * rows; i++) all.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      const sorted = [...all].sort((a, b) => a - b); const lo = sorted[Math.floor(sorted.length * 0.05)], hi = sorted[Math.floor(sorted.length * 0.95)] || 255;
      for (let i = 0; i < cols * rows; i++) { const l = (all[i] - lo) / Math.max(1, hi - lo); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.min(255, Math.max(0, l * 255)); }
      for (let i = 0; i < cols * rows; i++) {
        const l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
        lum[i] = Math.min(1, Math.max(0, (1 - l - 0.5) * k + 0.5 + density / 200 - 0.25));
      }
    };

    const draw = (t: number) => {
      if (!lum) return;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);
      if (bgMode === "solid") { ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H); }
      const swing = animated && !reduced ? Math.sin(t / 1000 * Math.PI * 2 * (animSpeed / 160)) * (animIntensity / 100) * 0.25 : 0;
      ctx.fillStyle = ink; const g = cellSize * 0.78, pad = (cellSize - g) / 2;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const v = lum[y * cols + x] + swing * (0.4 + lum[y * cols + x]);
        if (v > BAYER[(y & 3) * 4 + (x & 3)]) ctx.fillRect(ox + x * cellSize + pad, oy + y * cellSize + pad, g, g);
      }
    };

    const loop = (t: number) => { draw(t); if (animated && !reduced) frame = requestAnimationFrame(loop); };
    img.onload = () => { sample(); frame = requestAnimationFrame(loop); };
    const ro = new ResizeObserver(() => { if (img.complete && img.naturalWidth) { sample(); draw(performance.now()); } });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [src, cellSize, contrast, density, coverage, bgMode, animated, animSpeed, animIntensity, ink, paper, reduced]);

  return (
    <div role="status" aria-live="polite" aria-label={title ?? "Loading"} onClick={finish}
      className={cn("fixed inset-0 z-[1000] flex cursor-pointer flex-col items-center justify-center transition-opacity", leaving && "pointer-events-none opacity-0", className)}
      style={{ background: paper, color: ink, transitionDuration: `${reduced ? 0 : fadeMs}ms` }}>
      <canvas ref={canvasRef} aria-hidden="true" className="block h-[58vh] w-full" />
      {title ? <p className="mt-6 text-center text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-tight">{title}</p> : null}
      {subtitle ? <p className="mt-2 px-6 text-center text-sm opacity-60">{subtitle}</p> : null}
      <p className="absolute bottom-6 text-xs opacity-40">Tap or press any key to skip</p>
    </div>
  );
}
export default AsciiLoader;
