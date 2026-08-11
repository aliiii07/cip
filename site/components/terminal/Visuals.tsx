"use client";

import { useEffect, useRef } from "react";
import type { McResult, RelationshipGraph } from "@/lib/types";
import { prefersReducedMotion, TERMINAL_FONT } from "@/lib/motion";

/**
 * The canvas hook, in two modes.
 *
 * `animate: false` (the default) — draw once, redraw on resize. Used for the
 * small sidebar histogram, where a static read is correct.
 *
 * `animate: true` — loop at a capped ~30fps, passing elapsed ms as `t`. Every
 * animated visual below still renders its numbers from the same static
 * `McResult` / `RelationshipGraph` on every frame — only the *decoration*
 * moves (a peg shimmer, a travelling pulse, a replay of an already-computed
 * landing). Nothing here invents a value. The loop pauses off-screen via
 * IntersectionObserver and never starts under prefers-reduced-motion, where
 * the first frame is simply the final, settled state.
 */
function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  options?: { animate?: boolean }
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const animate = options?.animate ?? false;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    syncPalette(canvas);

    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = canvas.clientHeight || Number(canvas.dataset.h ?? 300);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const reduced = prefersReducedMotion();
    const runsLoop = animate && !reduced;

    let raf = 0;
    let visible = true;
    let last = 0;
    const start = performance.now();

    const frame = (now: number) => {
      if (runsLoop) raf = requestAnimationFrame(frame);
      if (!visible) return;
      if (runsLoop && last !== 0 && now - last < 33) return; // ~30fps cap
      last = now;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, runsLoop ? now - start : 0);
    };

    resize();
    if (runsLoop) raf = requestAnimationFrame(frame);
    else frame(performance.now());

    const ro = new ResizeObserver(() => {
      resize();
      if (!runsLoop) frame(performance.now());
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let io: IntersectionObserver | undefined;
    if (runsLoop) {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      io.observe(canvas);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
    };
  }, [animate]);

  return ref;
}

/**
 * Canvas cannot resolve a CSS custom property, so the palette is read off the
 * live computed style once per module load and refreshed whenever a canvas
 * mounts. That keeps these drawings on whatever theme the surrounding
 * `.t-dark` scope has set, instead of hardcoding the light values and
 * rendering ink-on-ink once the dashboard went dark.
 */
let INK = "#23231e";
let MUTED = "#8c8b81";
let FAINT = "#b4b3a9";
let HAIR = "#d5d3ca";
let GREEN = "#6e8f68";
let RED = "#9e4b47";
let AMBER = "#c9a227";

function syncPalette(el: Element | null) {
  if (typeof window === "undefined" || !el) return;
  const cs = getComputedStyle(el);
  const read = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;
  INK = read("--t-ink", INK);
  MUTED = read("--t-muted", MUTED);
  FAINT = read("--t-faint", FAINT);
  HAIR = read("--hair", HAIR);
  GREEN = read("--green-d", GREEN);
  RED = read("--red-d", RED);
  AMBER = read("--amber", AMBER);
}

/* ------------------------------------------------- 1. Probability lattice */

/**
 * A quincunx. The zones, pegs, scatter and histogram are the same computed
 * distribution on every frame — nothing here is re-sampled. What animates is
 * a small stream of balls continuously replaying that distribution's own
 * endpoints, one at a time, so the shape of the histogram reads as something
 * arrived-at rather than declared.
 */
export function ProbabilityLattice({ mc }: { mc: McResult }) {
  const ref = useCanvas(
    (ctx, w, h, t) => {
      const padX = 18;
      const [lo, hi] = mc.domain;
      const span = hi - lo || 1;
      const X = (v: number) => padX + ((v - lo) / span) * (w - padX * 2);

      const pegTop = 14;
      const pegBottom = h * 0.44;
      const scatterTop = h * 0.47;
      const scatterBottom = h * 0.6;
      const histTop = h * 0.66;
      const histBottom = h - 16;

      const zeroX = X(0);

      // Loss / profit zones
      ctx.fillStyle = "rgba(158,75,71,0.045)";
      ctx.fillRect(padX, pegTop, Math.max(0, zeroX - padX), histBottom - pegTop);
      ctx.fillStyle = "rgba(110,143,104,0.05)";
      ctx.fillRect(zeroX, pegTop, Math.max(0, w - padX - zeroX), histBottom - pegTop);

      // Peg field — a faint per-peg shimmer, never structural.
      const rows = 9;
      const rowGap = (pegBottom - pegTop) / rows;
      const pegPositions: { x: number; y: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const count = r + 3;
        const spread = (w - padX * 2) * (0.24 + (r / rows) * 0.66);
        const y = pegTop + r * rowGap;
        for (let i = 0; i < count; i++) {
          const tpos = count === 1 ? 0.5 : i / (count - 1);
          const x = zeroX + (tpos - 0.5) * spread;
          if (x < padX || x > w - padX) continue;
          pegPositions.push({ x, y });
          const shimmer = t ? 0.75 + 0.25 * Math.sin(t / 900 + r * 0.9 + i * 0.5) : 1;
          ctx.beginPath();
          ctx.arc(x, y, 1.15, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,179,169,${(0.9 * shimmer).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Landed paths — the full static scatter, always present.
      const band = scatterBottom - scatterTop;
      const yFor = (i: number) => {
        const j = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        return scatterTop + j * band;
      };
      mc.endpoints.forEach((v, i) => {
        const x = X(v);
        const y = yFor(i);
        ctx.fillStyle = v >= 0 ? "rgba(110,143,104,0.55)" : "rgba(158,75,71,0.53)";
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Histogram — the headline shape. Static, always fully shown.
      const maxCount = Math.max(...mc.bins.map((b) => b.count), 1);
      const barW = (w - padX * 2) / Math.max(mc.bins.length, 1);
      mc.bins.forEach((b, i) => {
        const bh = (b.count / maxCount) * (histBottom - histTop);
        const x = padX + i * barW;
        const mid = (b.from + b.to) / 2;
        ctx.fillStyle = mid >= 0 ? "rgba(110,143,104,0.8)" : "rgba(158,75,71,0.78)";
        ctx.fillRect(x + 0.6, histBottom - bh, Math.max(1, barW - 1.2), bh);
      });

      // Breakeven
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(zeroX, pegTop - 6);
      ctx.lineTo(zeroX, histBottom);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = HAIR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, histBottom + 0.5);
      ctx.lineTo(w - padX, histBottom + 0.5);
      ctx.stroke();

      ctx.font = `9px ${TERMINAL_FONT}`;
      ctx.fillStyle = MUTED;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(`${lo.toFixed(0)}%`, padX, histBottom + 5);
      ctx.textAlign = "right";
      ctx.fillText(`${hi.toFixed(0)}%`, w - padX, histBottom + 5);
      ctx.textAlign = "center";
      ctx.fillText("breakeven", zeroX, histBottom + 5);

      // Falling balls — three staggered lanes replaying real endpoints in
      // sequence. Each ball's landing point is exactly one of the scatter
      // dots already drawn above; the animation is a visual re-arrival of
      // data that is already counted, not a new sample.
      if (t > 0 && mc.endpoints.length > 0 && pegPositions.length > 4) {
        const CYCLE = 1100;
        const LANES = 3;
        for (let lane = 0; lane < LANES; lane++) {
          const phase = (lane * CYCLE) / LANES;
          const local = (t + phase) % CYCLE;
          const progress = local / CYCLE;
          const cycleIndex = Math.floor((t + phase) / CYCLE) + lane * 977;
          const idx = cycleIndex % mc.endpoints.length;
          const v = mc.endpoints[idx];
          const targetX = X(v);
          const targetY = yFor(idx);

          const eased = 1 - Math.pow(1 - progress, 2.2);
          const y = pegTop + eased * (targetY - pegTop);
          // A gentle horizontal wander toward the target, as if bouncing pegs.
          const wobble = Math.sin(progress * Math.PI * 3) * (1 - progress) * 8;
          const x = zeroX + (targetX - zeroX) * eased + wobble;

          const fade = progress > 0.88 ? 1 - (progress - 0.88) / 0.12 : 1;
          if (fade <= 0) continue;

          ctx.beginPath();
          ctx.arc(x, y, 2.1, 0, Math.PI * 2);
          ctx.fillStyle = v >= 0
            ? `rgba(110,143,104,${(0.9 * fade).toFixed(3)})`
            : `rgba(158,75,71,${(0.9 * fade).toFixed(3)})`;
          ctx.fill();

          // A brief landing flash near the end of the fall.
          if (progress > 0.82) {
            const ringT = (progress - 0.82) / 0.18;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 2 + ringT * 6, 0, Math.PI * 2);
            ctx.strokeStyle = v >= 0
              ? `rgba(110,143,104,${(0.4 * (1 - ringT)).toFixed(3)})`
              : `rgba(158,75,71,${(0.4 * (1 - ringT)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    },
    { animate: true }
  );

  return <canvas ref={ref} data-h="330" className="block h-[330px] w-full" />;
}

/* --------------------------------------------------- 2. Tail probability */

/**
 * A receding ridge plot. Geometry is fixed by the computed density curves;
 * the front ridge breathes gently, the strike line marches, and a few
 * particles drift up into the filled tail — read the tail, don't just look
 * at it.
 */
export function TailRidge({ mc }: { mc: McResult }) {
  const ref = useCanvas(
    (ctx, w, h, t) => {
      const ridges = mc.ridges;
      if (ridges.length === 0) return;

      const padX = 20;
      const padTop = 16;
      const padBottom = 26;
      const [lo, hi] = mc.domain;
      const span = hi - lo || 1;

      const n = ridges.length;
      const rowGap = (h - padTop - padBottom) / (n + 1.4);
      const insetPer = 9;

      // A wave that travels back through the stack rather than a single ridge
      // pulsing in place. Amplitude is deliberately well above the old 3.5%,
      // which sat under the threshold where the eye registers motion at all
      // and made a running animation read as a frozen image.
      const breatheAt = (i: number) =>
        t ? 1 + 0.11 * Math.sin(t / 1150 - i * 0.55) : 1;
      const breathe = breatheAt(0);

      const strikeX = (v: number, inset: number) =>
        padX + inset + ((v - lo) / span) * (w - padX * 2 - inset * 2);

      for (let i = n - 1; i >= 0; i--) {
        const ridge = ridges[i];
        const inset = i * insetPer;
        const baseY = h - padBottom - i * rowGap;
        const pts = ridge.density.length;
        const amp = rowGap * 2.15 * breatheAt(i);

        const xAt = (k: number) =>
          padX + inset + (k / (pts - 1)) * (w - padX * 2 - inset * 2);
        const yAt = (k: number) => baseY - ridge.density[k] * amp;

        ctx.beginPath();
        ctx.moveTo(xAt(0), baseY);
        for (let k = 0; k < pts; k++) ctx.lineTo(xAt(k), yAt(k));
        ctx.lineTo(xAt(pts - 1), baseY);
        ctx.closePath();
        ctx.fillStyle = "#f1f0e9";
        ctx.fill();

        const tailStart = pts * ((15 - lo) / span);
        if (tailStart < pts - 1) {
          const k0 = Math.max(0, Math.floor(tailStart));
          const tailPulse = i === 0 && t ? 0.34 + 0.19 * Math.sin(t / 780) : 0.4;
          ctx.beginPath();
          ctx.moveTo(xAt(k0), baseY);
          for (let k = k0; k < pts; k++) ctx.lineTo(xAt(k), yAt(k));
          ctx.lineTo(xAt(pts - 1), baseY);
          ctx.closePath();
          ctx.fillStyle = `rgba(158,75,71,${tailPulse.toFixed(3)})`;
          ctx.fill();
        }

        ctx.beginPath();
        for (let k = 0; k < pts; k++) {
          if (k === 0) ctx.moveTo(xAt(k), yAt(k));
          else ctx.lineTo(xAt(k), yAt(k));
        }
        ctx.strokeStyle = i === 0 ? INK : MUTED;
        ctx.lineWidth = i === 0 ? 1.15 : 0.8;
        ctx.globalAlpha = i === 0 ? 1 : 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.font = `8.5px ${TERMINAL_FONT}`;
        ctx.fillStyle = FAINT;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`t${ridge.session}`, padX + inset - 3, baseY - 3);
      }

      // Particles drifting up into the front ridge's tail — a visual read of
      // "mass entering the tail," looped, never counted twice.
      if (t > 0 && mc.tails.tailMass > 0) {
        const front = ridges[0];
        const frontBaseY = h - padBottom;
        const frontAmp = rowGap * 2.15 * breathe;
        const tailStartFrac = (15 - lo) / span;
        const PARTICLES = 16;
        for (let p = 0; p < PARTICLES; p++) {
          const cycle = 2600;
          const phase = (p * cycle) / PARTICLES;
          const local = ((t + phase) % cycle) / cycle;
          const kFrac = tailStartFrac + (1 - tailStartFrac) * (0.15 + 0.7 * ((p * 0.37) % 1));
          const k = Math.min(front.density.length - 1, Math.floor(kFrac * front.density.length));
          const x = padX + (k / (front.density.length - 1)) * (w - padX * 2);
          const ceilingY = frontBaseY - front.density[k] * frontAmp;
          const y = frontBaseY - local * (frontBaseY - ceilingY);
          const fade = Math.sin(local * Math.PI);
          if (fade <= 0.02) continue;
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(158,75,71,${(0.55 * fade).toFixed(3)})`;
          ctx.fill();
        }
      }

      ctx.save();
      ctx.setLineDash([4, 4]);
      if (t) ctx.lineDashOffset = -(t / 55) % 8;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(strikeX(15, 0), h - padBottom);
      ctx.lineTo(strikeX(15, (n - 1) * insetPer), h - padBottom - (n - 1) * rowGap);
      ctx.stroke();
      ctx.restore();

      ctx.font = `9px ${TERMINAL_FONT}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${lo.toFixed(0)}%`, padX, h - padBottom + 7);
      ctx.textAlign = "right";
      ctx.fillText(`${hi.toFixed(0)}%`, w - padX, h - padBottom + 7);
      ctx.fillStyle = RED;
      ctx.textAlign = "center";
      ctx.fillText("+15%", strikeX(15, 0), h - padBottom + 7);
    },
    { animate: true }
  );

  return <canvas ref={ref} data-h="300" className="block h-[300px] w-full" />;
}

/* ------------------------------------------------ 3. Relationship graph */

const NODE_COLOR: Record<string, string> = {
  hub: INK,
  bull: GREEN,
  bear: RED,
  catalyst: AMBER,
};

/**
 * The static layout — node positions, edge weights, the median path — is
 * fixed data. What moves is a signal pulse travelling the median path and a
 * slow breathing on each node radius, standing in for "the engine is
 * currently weighing this relationship," not for new correlations arriving.
 */
export function MirofishGraph({ graph }: { graph: RelationshipGraph }) {
  const ref = useCanvas(
    (ctx, w, h, t) => {
      const pad = 34;
      const X = (v: number) => pad + v * (w - pad * 2);
      const Y = (v: number) => pad + v * (h - pad * 2);
      const at = (id: string) => {
        const n = graph.nodes.find((x) => x.id === id);
        return n ? { x: X(n.x), y: Y(n.y) } : null;
      };

      for (const e of graph.edges) {
        const a = at(e.from);
        const b = at(e.to);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(140,139,129,${0.18 + e.weight * 0.5})`;
        ctx.lineWidth = 0.5 + e.weight * 3;
        ctx.stroke();
      }

      const pathPoints = graph.medianPath.map((id) => at(id)).filter(Boolean) as {
        x: number;
        y: number;
      }[];

      if (pathPoints.length > 2) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        if (t) ctx.lineDashOffset = -(t / 45) % 9;
        ctx.strokeStyle = "rgba(35,35,30,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        pathPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else {
            const prev = pathPoints[i - 1];
            const cx = (prev.x + p.x) / 2;
            const cy = (prev.y + p.y) / 2 - 26;
            ctx.quadraticCurveTo(cx, cy, p.x, p.y);
          }
        });
        ctx.stroke();
        ctx.restore();

        // A single pulse of "signal" travelling the median path, looping.
        if (t > 0) {
          const CYCLE = 2600;
          const progress = (t % CYCLE) / CYCLE;
          const segCount = pathPoints.length - 1;
          const segF = progress * segCount;
          const seg = Math.min(segCount - 1, Math.floor(segF));
          const localT = segF - seg;
          const a = pathPoints[seg];
          const b = pathPoints[seg + 1];
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2 - 26;
          const mt = 1 - localT;
          const px = mt * mt * a.x + 2 * mt * localT * cx + localT * localT * b.x;
          const py = mt * mt * a.y + 2 * mt * localT * cy + localT * localT * b.y;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          // Canvas text/fill can't resolve CSS custom properties — this must
          // stay a literal hex, kept in sync with --signal by eye.
          ctx.fillStyle = "#e23b3b";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(226,59,59,0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      graph.nodes.forEach((n, ni) => {
        const x = X(n.x);
        const y = Y(n.y);
        const breathe = t ? 1 + 0.16 * Math.sin(t / 820 + ni * 1.3) : 1;
        const r = (n.id === "SELF" ? 11 : 7.5) * breathe;
        const color = NODE_COLOR[n.klass] ?? MUTED;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (n.estimated) {
          ctx.fillStyle = "#f1f0e9";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.setLineDash([2.5, 2.5]);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = color;
          ctx.fill();
        }

        ctx.font = `600 9.5px ${TERMINAL_FONT}`;
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(n.label, x, y + r + 5);

        if (n.r != null && n.id !== "SELF") {
          ctx.fillStyle = MUTED;
          ctx.font = `8.5px ${TERMINAL_FONT}`;
          ctx.fillText(`r ${n.r.toFixed(2)}`, x, y + r + 17);
        } else if (n.estimated) {
          ctx.fillStyle = FAINT;
          ctx.font = `8.5px ${TERMINAL_FONT}`;
          ctx.fillText("not measured", x, y + r + 17);
        }
      });
    },
    { animate: true }
  );

  return <canvas ref={ref} data-h="330" className="block h-[330px] w-full" />;
}

/** Small 24-bar edge-distribution histogram for the graph sidebar. Static read. */
export function MiniHistogram({ bins }: { bins: number[] }) {
  const ref = useCanvas((ctx, w, h) => {
    const bw = w / Math.max(bins.length, 1);
    bins.forEach((v, i) => {
      const bh = v * (h - 4);
      ctx.fillStyle = i < bins.length / 2 ? "rgba(158,75,71,0.55)" : "rgba(110,143,104,0.6)";
      ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1), bh);
    });
  });
  return <canvas ref={ref} data-h="42" className="block h-[42px] w-full" />;
}
