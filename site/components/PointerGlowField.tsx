"use client";

import { useEffect } from "react";
import { hasFinePointer } from "@/lib/motion";

/**
 * One document-level mousemove listener drives every `.pointer-glow` element
 * on the page — event delegation instead of a ref + effect per card. Mounted
 * once at the root layout so both the marketing site and the terminal share
 * it; the CSS in globals.css (`.pointer-glow::before`) does the actual
 * painting from the --gx/--gy custom properties this sets.
 */
export function PointerGlowField() {
  useEffect(() => {
    if (!hasFinePointer()) return;

    let raf = 0;
    let last: HTMLElement | null = null;

    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target =
          (e.target as Element | null)?.closest<HTMLElement>(".pointer-glow") ?? null;
        if (target) {
          const r = target.getBoundingClientRect();
          target.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
          target.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        }
        if (last && last !== target) last.style.removeProperty("--gx");
        last = target;
      });
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
