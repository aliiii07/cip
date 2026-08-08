"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "./motion";

/**
 * A restrained magnetic-hover: the element leans a few pixels toward the
 * cursor and eases back on leave. Mouse-only, and off entirely under reduced
 * motion — this is a garnish, never load-bearing.
 */
export function useMagnetic<T extends HTMLElement>(strength = 10) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
      const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0, 0)";
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return ref;
}

// The cursor-following panel glow (--gx/--gy) is driven by one document-level
// listener instead — see components/PointerGlowField.tsx. Event delegation
// there covers every `.pointer-glow` element without a hook per panel.
