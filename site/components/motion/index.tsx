"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

export { SmoothScroll } from "./SmoothScroll";

/**
 * The motion system.
 *
 * Five patterns, one file, one easing curve. The point of keeping them
 * together is consistency: scattered bespoke effects are the tell of a page
 * assembled rather than designed, so every animated thing on a page should
 * come from here or have a reason not to.
 *
 * Every primitive checks prefers-reduced-motion and renders its settled
 * state immediately when it is set. Not a shorter animation, the end state.
 */

/** Expo-out. Fast departure, long settle. The house curve. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ------------------------------------------------------------ in-view hook */

/**
 * Fires once, then disconnects. A reveal that replays every time an element
 * re-enters the viewport draws attention to itself on the way back up the
 * page, which is the opposite of what it is for.
 */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, seen };
}

/* ---------------------------------------------------------------- 1. reveal */

/** Fade and rise. The default entrance for anything that scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: ElementType;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLDivElement>(0.15);
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : `translate3d(0, ${y}px, 0)`,
        transition: `opacity 0.7s ${EASE_CSS} ${delay}ms, transform 0.7s ${EASE_CSS} ${delay}ms`,
        willChange: seen ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------------- 2. countUp */

/**
 * Counts once, on entry. Formatting is passed as plain props rather than a
 * formatter callback, because these render from server components and a
 * function cannot cross that boundary.
 */
export function CountUp({
  to,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  thousands = true,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  thousands?: boolean;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);

  const shown = seen ? value : 0;
  const body = thousands
    ? shown.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : shown.toFixed(decimals);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {body}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------- 3. shrinking nav */

/**
 * Returns whether the page has scrolled past a threshold, for a nav that
 * compacts. Height and padding are animated, never the font size: animating
 * type triggers layout on every frame and the text visibly reflows.
 */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ------------------------------------------------- 4. hover microinteraction */

/**
 * A small lean toward the cursor. Fine pointers only: on touch there is no
 * hover, and the transform would simply never fire while still costing a
 * listener and a composite layer.
 */
export function useMagnetic<T extends HTMLElement>(strength = 10) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      el.style.transform = "translate3d(0, 0, 0)";
    };

    el.style.transition = `transform 0.4s ${EASE_CSS}`;
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}

/* --------------------------------------------------------- 5. pinned scroll */

/**
 * Progress through a scroll-pinned track, 0 to 1.
 *
 * Measured from the track's own rect against its scroll travel, which is the
 * distance it is taller than the viewport. That is exactly how long the pane
 * stays pinned, so the progress and the pin can never drift apart, and it
 * keeps working if the track height or the viewport changes.
 *
 * A caveat worth knowing: `position: sticky` is silently disabled by any
 * ancestor that is a scroll container, which includes anything with
 * `overflow: hidden`. Use `overflow-x: clip` instead where a guard is needed.
 */
export function usePinnedProgress<T extends HTMLElement>(steps = 1) {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(p);
      const next = Math.min(steps - 1, Math.floor(p * steps));
      setIndex((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [steps]);

  return { ref, progress, index };
}
