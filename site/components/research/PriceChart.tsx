"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, createChart, type UTCTimestamp } from "lightweight-charts";
import type { ResearchEvent } from "@/lib/research-types";
import { siteFont } from "@/lib/motion";
import { useCandles } from "./hooks";
import { GREEN, HAIR, INK, MUTED, RED, Skeleton, Unavailable } from "./atoms";

const RANGES = [
  { key: "1m", label: "1M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
  { key: "max", label: "MAX" },
];

const FONT = () => siteFont();

/**
 * One clean line of closes with the dated events as dots. Hovering a dot
 * shows the event. Real closes only, from the same feed as everything else.
 */
export function PriceChart({ symbol, events, currency }: { symbol: string; events: ResearchEvent[]; currency: string }) {
  const [range, setRange] = useState("1y");
  const { bars, meta, state } = useCandles(symbol, range);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const eventsByDay = useMemo(() => new Map(events.map((e) => [e.date, e])), [events]);

  useEffect(() => {
    const el = ref.current;
    if (!el || bars.length === 0) return;

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: MUTED, fontSize: 10, fontFamily: FONT() },
      grid: { vertLines: { color: "rgba(228,228,231,0.6)" }, horzLines: { color: "rgba(228,228,231,0.6)" } },
      rightPriceScale: { borderColor: HAIR },
      timeScale: { borderColor: HAIR, timeVisible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
      height: 300,
      autoSize: true,
    });
    const series = chart.addAreaSeries({
      lineColor: INK,
      topColor: "rgba(26,26,26,0.12)",
      bottomColor: "rgba(26,26,26,0)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(bars.map((b) => ({ time: b.time as UTCTimestamp, value: b.close })));

    // Dots for the dated events: the bar on that day, or the first bar after it.
    const dayOf = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
    const markers: { time: UTCTimestamp; position: "aboveBar" | "belowBar"; color: string; shape: "circle"; text: string }[] = [];
    const dotDays = new Map<string, ResearchEvent>();
    for (const e of events) {
      const bar = bars.find((b) => dayOf(b.time) >= e.date);
      if (!bar || Date.parse(dayOf(bar.time)) - Date.parse(e.date) > 8 * 86400000) continue;
      markers.push({ time: bar.time as UTCTimestamp, position: e.kind === "bad" ? "belowBar" : "aboveBar", color: e.kind === "bad" ? RED : GREEN, shape: "circle", text: "" });
      dotDays.set(dayOf(bar.time), e);
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    series.setMarkers(markers);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      const day = dayOf(param.time as number);
      const e = dotDays.get(day) ?? eventsByDay.get(day);
      setHover(e ? { x: param.point.x, y: param.point.y, text: `${e.date}: ${e.title}` } : null);
    });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [bars, events, eventsByDay]);

  const last = bars[bars.length - 1];
  const first = bars[0];
  const changePct = first && last ? ((last.close - first.close) / first.close) * 100 : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[#E4E4E7] p-0.5" role="tablist" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors duration-200 ${
                range === r.key ? "bg-[#1a1a1a] text-white" : "text-[#4a4a4a] hover:text-[#1a1a1a]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {changePct != null ? (
          <span className="text-[12px] tabular-nums" style={{ color: changePct >= 0 ? GREEN : RED }}>
            {changePct >= 0 ? "+" : "−"}
            {Math.abs(changePct).toFixed(1)}% over this range
          </span>
        ) : null}
      </div>

      <div className="relative mt-3">
        {state === "loading" ? <Skeleton className="h-[300px] w-full" /> : null}
        {state === "error" ? <Unavailable text="Price data unavailable, retrying is manual: reload the page." /> : null}
        <div ref={ref} className={state === "ready" ? "w-full" : "hidden"} />
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[260px] rounded-[10px] bg-[#0A0A0A] px-3 py-2 text-[12px] leading-snug text-white"
            style={{ left: Math.min(hover.x + 12, 480), top: Math.max(4, hover.y - 48) }}
          >
            {hover.text}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] text-[#71717A]">
        Close prices in {currency}. Source: Yahoo Finance{meta ? `, as of ${new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10)}` : ""}. Dots mark the big moments listed on the right.
      </p>
    </div>
  );
}
