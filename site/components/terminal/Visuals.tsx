"use client";

import { useEffect, useRef } from "react";
import type { McResult, RelationshipGraph } from "@/lib/types";

/* ------------------------------------------------------------ canvas hook */

function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = canvas.clientHeight || Number(canvas.dataset.h ?? 300);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h);
    };

    render();
    const ro = new ResizeObserver(render);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  });

  return ref;
}

const INK = "#23231e";
const MUTED = "#8c8b81";
const FAINT = "#b4b3a9";
const HAIR = "#d5d3ca";
const GREEN = "#6e8f68";
const RED = "#9e4b47";

/* ------------------------------------------------- 1. Probability lattice */

/**
 * A quincunx. Paths fall through a peg field, biased by the strategy's measured
 * edge, and land either side of the dashed breakeven line. The histogram
 * beneath is the same 5,000 endpoints, binned.
 *
 * The point of drawing it this way: a single expectancy number hides the
 * spread. A Galton board cannot.
 */
export function ProbabilityLattice({ mc }: { mc: McResult }) {
  const ref = useCanvas((ctx, w, h) => {
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

    // Peg field
    const rows = 9;
    const rowGap = (pegBottom - pegTop) / rows;
    ctx.fillStyle = FAINT;
    for (let r = 0; r < rows; r++) {
      const count = r + 3;
      const spread = (w - padX * 2) * (0.24 + (r / rows) * 0.66);
      const y = pegTop + r * rowGap;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = zeroX + (t - 0.5) * spread;
        if (x < padX || x > w - padX) continue;
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Landed paths
    const band = scatterBottom - scatterTop;
    mc.endpoints.forEach((v, i) => {
      const x = X(v);
      // deterministic vertical jitter, so the scatter is stable across redraws
      const j = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const y = scatterTop + j * band;
      ctx.fillStyle = v >= 0 ? "rgba(110,143,104,0.62)" : "rgba(158,75,71,0.6)";
      ctx.beginPath();
      ctx.arc(x, y, 1.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // Histogram
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

    // Axis
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, histBottom + 0.5);
    ctx.lineTo(w - padX, histBottom + 0.5);
    ctx.stroke();

    ctx.font = "9px ui-monospace, monospace";
    ctx.fillStyle = MUTED;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(`${lo.toFixed(0)}%`, padX, histBottom + 5);
    ctx.textAlign = "right";
    ctx.fillText(`${hi.toFixed(0)}%`, w - padX, histBottom + 5);
    ctx.textAlign = "center";
    ctx.fillText("breakeven", zeroX, histBottom + 5);
  });

  return <canvas ref={ref} data-h="330" className="block h-[330px] w-full" />;
}

/* --------------------------------------------------- 2. Tail probability */

/**
 * A receding ridge plot: the return distribution after each successive trade,
 * drawn front-to-back. The right tail past +15% is filled — the outcomes that
 * a headline average would quietly absorb.
 */
export function TailRidge({ mc }: { mc: McResult }) {
  const ref = useCanvas((ctx, w, h) => {
    const ridges = mc.ridges;
    if (ridges.length === 0) return;

    const padX = 20;
    const padTop = 16;
    const padBottom = 26;
    const [lo, hi] = mc.domain;
    const span = hi - lo || 1;

    const n = ridges.length;
    const rowGap = (h - padTop - padBottom) / (n + 1.4);
    const amp = rowGap * 2.15;
    const insetPer = 9;

    const strikeX = (v: number, inset: number) =>
      padX + inset + ((v - lo) / span) * (w - padX * 2 - inset * 2);

    // Back to front, so nearer ridges overlap further ones.
    for (let i = n - 1; i >= 0; i--) {
      const ridge = ridges[i];
      const inset = i * insetPer;
      const baseY = h - padBottom - i * rowGap;
      const pts = ridge.density.length;

      const xAt = (k: number) =>
        padX + inset + (k / (pts - 1)) * (w - padX * 2 - inset * 2);
      const yAt = (k: number) => baseY - ridge.density[k] * amp;

      // Opaque fill so the ridge occludes the one behind it.
      ctx.beginPath();
      ctx.moveTo(xAt(0), baseY);
      for (let k = 0; k < pts; k++) ctx.lineTo(xAt(k), yAt(k));
      ctx.lineTo(xAt(pts - 1), baseY);
      ctx.closePath();
      ctx.fillStyle = "#f1f0e9";
      ctx.fill();

      // Right tail (>= +15%) in brick
      const tailStart = pts * ((15 - lo) / span);
      if (tailStart < pts - 1) {
        const k0 = Math.max(0, Math.floor(tailStart));
        ctx.beginPath();
        ctx.moveTo(xAt(k0), baseY);
        for (let k = k0; k < pts; k++) ctx.lineTo(xAt(k), yAt(k));
        ctx.lineTo(xAt(pts - 1), baseY);
        ctx.closePath();
        ctx.fillStyle = "rgba(158,75,71,0.4)";
        ctx.fill();
      }

      // Ridgeline
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

      ctx.font = "8.5px ui-monospace, monospace";
      ctx.fillStyle = FAINT;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`t${ridge.session}`, padX + inset - 3, baseY - 3);
    }

    // The dashed strike line: +15% carried back through the perspective.
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(strikeX(15, 0), h - padBottom);
    ctx.lineTo(strikeX(15, (n - 1) * insetPer), h - padBottom - (n - 1) * rowGap);
    ctx.stroke();
    ctx.restore();

    ctx.font = "9px ui-monospace, monospace";
    ctx.fillStyle = MUTED;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${lo.toFixed(0)}%`, padX, h - padBottom + 7);
    ctx.textAlign = "right";
    ctx.fillText(`${hi.toFixed(0)}%`, w - padX, h - padBottom + 7);
    ctx.fillStyle = RED;
    ctx.textAlign = "center";
    ctx.fillText("+15%", strikeX(15, 0), h - padBottom + 7);
  });

  return <canvas ref={ref} data-h="300" className="block h-[300px] w-full" />;
}

/* ------------------------------------------------ 3. Relationship graph */

const NODE_COLOR: Record<string, string> = {
  hub: INK,
  bull: GREEN,
  bear: RED,
  catalyst: "#c9a227",
};

/**
 * How the asset co-moves with its reference set. Edge thickness is |Pearson r|
 * over log returns; a hollow node means we could not measure that pair and are
 * saying so rather than drawing a number we do not have.
 */
export function MirofishGraph({ graph }: { graph: RelationshipGraph }) {
  const ref = useCanvas((ctx, w, h) => {
    const pad = 34;
    const X = (t: number) => pad + t * (w - pad * 2);
    const Y = (t: number) => pad + t * (h - pad * 2);
    const at = (id: string) => {
      const n = graph.nodes.find((x) => x.id === id);
      return n ? { x: X(n.x), y: Y(n.y) } : null;
    };

    // Edges
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

    // Dashed median path arcing across the strongest couplings
    if (graph.medianPath.length > 2) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "rgba(35,35,30,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      graph.medianPath.forEach((id, i) => {
        const p = at(id);
        if (!p) return;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else {
          const prev = at(graph.medianPath[i - 1])!;
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2 - 26;
          ctx.quadraticCurveTo(cx, cy, p.x, p.y);
        }
      });
      ctx.stroke();
      ctx.restore();
    }

    // Nodes
    for (const n of graph.nodes) {
      const x = X(n.x);
      const y = Y(n.y);
      const r = n.id === "SELF" ? 11 : 7.5;
      const color = NODE_COLOR[n.klass] ?? MUTED;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (n.estimated) {
        // Hollow = not measured. Never a solid dot for a number we don't have.
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

      ctx.font = "9.5px ui-monospace, monospace";
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(n.label, x, y + r + 5);

      if (n.r != null && n.id !== "SELF") {
        ctx.fillStyle = MUTED;
        ctx.font = "8.5px ui-monospace, monospace";
        ctx.fillText(`r ${n.r.toFixed(2)}`, x, y + r + 17);
      } else if (n.estimated) {
        ctx.fillStyle = FAINT;
        ctx.font = "8.5px ui-monospace, monospace";
        ctx.fillText("not measured", x, y + r + 17);
      }
    }
  });

  return <canvas ref={ref} data-h="330" className="block h-[330px] w-full" />;
}

/** Small 24-bar edge-distribution histogram for the graph sidebar. */
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
