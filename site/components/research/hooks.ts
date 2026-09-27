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
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const ratios = useRef(new Map<string, number>());
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.current.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = ids[0];
        let bestRatio = -1;
        for (const id of ids) {
          const r = ratios.current.get(id) ?? 0;
          if (r > bestRatio) {
            best = id;
            bestRatio = r;
          }
        }
        if (bestRatio > 0) setActive(best);
      },
      { rootMargin: "-120px 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ids]);
  return active;
}
