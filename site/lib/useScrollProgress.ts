"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * Reads how far a section has scrolled through the viewport (0 = just
 * entering from the bottom, 1 = just leaving the top) and writes it to a CSS
 * custom property on the element. Pure transform reads in CSS consume it —
 * no React re-render per scroll frame, which is what keeps this cheap enough
 * to run on every section at once.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = 1 - Math.min(1, Math.max(0, r.top / vh));
      el.style.setProperty("--scroll-p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
