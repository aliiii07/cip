"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * The hero's ambient layer: a loose network of drifting nodes, occasionally
 * wiring together — the visual idea of price nodes finding correlation. It
 * sits behind the hero copy at low opacity so it reads as atmosphere, not a
 * competing graphic.
 *
 * Deliberately not WebGL: a few dozen points on a 2D canvas costs nothing and
 * says the same thing as a Three.js field would. Pauses off-screen and is
 * absent entirely under reduced motion.
 */
export function AmbientField({
  className = "",
  palette = "signal",
}: {
  className?: string;
  /** "signal" for the black deck (white nodes, crimson links); "terminal"
   *  for the warm paper surface (ink nodes, amber links). */
  palette?: "signal" | "terminal";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkColor = palette === "terminal" ? "201,162,39" : "226,59,59";
  const nodeColor = palette === "terminal" ? "35,35,30" : "255,255,255";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let last = 0;

    const COUNT_DESKTOP = 46;
    const COUNT_MOBILE = 22;
    const LINK_DIST = 150;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
    }
    let nodes: Node[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = w < 768 ? COUNT_MOBILE : COUNT_DESKTOP;
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 1 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (!visible) return;
      // ~30fps is indistinguishable here and halves the cost.
      if (t - last < 33) return;
      last = t;

      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(${linkColor},${(1 - dist / LINK_DIST) * 0.14})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const twinkle = 0.5 + 0.5 * Math.sin(t / 1400 + n.phase);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColor},${0.16 + twinkle * 0.22})`;
        ctx.fill();
      }
    };

    resize();
    raf = requestAnimationFrame(step);

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [linkColor, nodeColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
