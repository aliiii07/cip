"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DECK_FOOTER } from "@/lib/constants";

/** Fires once when the element first enters the viewport. */
function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);

  return { ref, seen };
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

/** The page marker every deck slide carries in its bottom-left corner. */
export function SlideNo({ n }: { n: string }) {
  return (
    <div className="slide-no absolute bottom-7 left-[var(--gutter)] hidden md:block">
      {n} — {DECK_FOOTER}
    </div>
  );
}

/**
 * A deck slide. `tone="paper"` inverts to the light background the deck uses
 * for About / What we do / By the numbers / What's next.
 */
export function Slide({
  id,
  n,
  tone = "ink",
  className = "",
  children,
}: {
  id?: string;
  n?: string;
  tone?: "ink" | "paper";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`deck-slide ${tone === "paper" ? "on-paper" : ""} ${className}`}
    >
      <div className="deck-inner">{children}</div>
      {n ? <SlideNo n={n} /> : null}
    </section>
  );
}

/**
 * Counts to a target once scrolled into view. Respects reduced motion.
 *
 * Formatting is expressed as plain props rather than a callback — these are
 * rendered from server components, and a function cannot cross that boundary.
 */
export function CountUp({
  to,
  duration = 1250,
  prefix = "",
  suffix = "",
  thousands = false,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  thousands?: boolean;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo — fast start, long settle
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);

  const shown = Math.round(seen ? value : 0);
  const body = thousands ? shown.toLocaleString("en-US") : String(shown);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {body}
      {suffix}
    </span>
  );
}

/**
 * The problem slide's motif. Rather than printing two static numbers, the
 * second one *travels* from +200% down to −30%, colouring red as it falls —
 * the gap between a naive backtest and live reality, shown rather than stated.
 */
export function GapMotif() {
  const { ref, seen } = useInView<HTMLDivElement>(0.5);
  const [v, setV] = useState(200);

  useEffect(() => {
    if (!seen) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setV(-30);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(200 + (-30 - 200) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen]);

  // Whiteness bleeds out as the number falls below zero.
  const fallen = Math.min(1, Math.max(0, (200 - v) / 230));
  const color = v < 0 ? "var(--signal)" : `rgb(${255 - fallen * 29}, ${255 - fallen * 196} , ${255 - fallen * 196})`;

  return (
    <div ref={ref} className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <span className="stat-figure">+200%</span>
      <span
        aria-hidden
        className="text-3xl md:text-4xl"
        style={{ color: "var(--muted-2)" }}
      >
        →
      </span>
      <span className="stat-figure" style={{ color }}>
        {v < 0 ? "−" : "+"}
        {Math.abs(v).toFixed(0)}%
      </span>
    </div>
  );
}
