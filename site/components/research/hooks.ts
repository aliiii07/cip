"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { ChartMeta, DailyBar } from "@/lib/yahoo";

export type LoadState = "loading" | "ready" | "error";

/** Native bars from /api/candles for one symbol and range. */
export function useCandles(symbol: string, range: string) {
  const [bars, setBars] = useState<DailyBar[]>([]);
  const [meta, setMeta] = useState<ChartMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as { bars: DailyBar[]; meta: ChartMeta };
      })
      .then((body) => {
        if (cancelled) return;
        setBars(body.bars);
        setMeta(body.meta);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return { bars, meta, state };
}

/** True once the element has been on screen. Fires once, then disconnects. */
export function useSeen<T extends HTMLElement>(ref: RefObject<T>, rootMargin = "200px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen, rootMargin]);
  return seen;
}

/** Which of the given section ids is currently in view, for the tab bar. */
/**
 * The section whose top has passed the sticky bars is the active one; at
 * the end of the page the last section wins, since it may be too short to
 * reach the top. Measured on scroll rather than observed, so the answer is
 * the same at the top of the page on a phone, where no section is in view
 * yet, as everywhere else.
 */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  // A clicked tab stays active until the reader scrolls on their own, since
  // the last sections may be too short to put the clicked one at the top.
  // The pin watches the section's own position rather than scrollY, so a
  // block loading above it (which the browser anchors around) keeps the pin.
  const pin = useRef<{ id: string; animating: boolean; settledTop: number } | null>(null);
  const topOf = (id: string) => document.getElementById(id)?.getBoundingClientRect().top ?? 0;

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const p = pin.current;
      if (p) {
        if (p.animating || Math.abs(topOf(p.id) - p.settledTop) < 3) return;
        pin.current = null;
      }
      const line = 140;
      const atEnd = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
      let current = ids[0];
      if (atEnd) {
        current = ids[ids.length - 1];
      } else {
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        }
      }
      setActive((prev) => (prev === current ? prev : current));
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
  }, [ids]);

  // Scrolls a section under the sticky bars. Driven here rather than by the
  // site's smooth scroll, which would put the section under the bars.
  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const from = window.scrollY;
    const to = Math.max(0, el.getBoundingClientRect().top + from - 120);
    setActive(id);
    pin.current = { id, animating: true, settledTop: 0 };
    const settle = () => {
      const p = pin.current;
      if (p && p.id === id) pin.current = { id, animating: false, settledTop: topOf(id) };
    };
    // "instant" overrides the global smooth scroll-behavior, which would
    // otherwise animate every frame of the glide below on its own.
    const jump = (y: number) => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      jump(to);
      requestAnimationFrame(settle);
      return;
    }
    // A short expo out glide, so the distance decides nothing.
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      jump(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else requestAnimationFrame(settle);
    };
    requestAnimationFrame(step);
  };

  return { active, jumpTo };
}
