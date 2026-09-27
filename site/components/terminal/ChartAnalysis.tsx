"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, Indicators } from "@/lib/types";
import { Stat, fmt, pct } from "./atoms";
import { TERMINAL_FONT } from "@/lib/motion";

/**
 * Native candles. No Heikin-Ashi, no smoothing — what is drawn is what traded.
 * MA20/MA50 and the clustered support/resistance levels are overlays on top of
 * that series, never substitutes for it.
 */
export function ChartAnalysis({
  candles,
  indicators,
}: {
  candles: Candle[];
  indicators: Indicators;
}) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current || !rsiRef.current || candles.length === 0) return;

    const common = {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#71717A",
        fontSize: 10,
        fontFamily: TERMINAL_FONT,
      },
      grid: {
        vertLines: { color: "rgba(228,228,231,0.6)" },
        horzLines: { color: "rgba(228,228,231,0.6)" },
      },
      rightPriceScale: { borderColor: "#E4E4E7" },
      timeScale: { borderColor: "#E4E4E7", timeVisible: true },
      crosshair: { mode: 0 as const },
    };

    const chart: IChartApi = createChart(priceRef.current, {
      ...common,
      height: 300,
      autoSize: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#0E7A57",
      downColor: "#A12F35",
      wickUpColor: "#0E7A57",
      wickDownColor: "#A12F35",
      borderVisible: false,
    });
    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const line = (values: (number | null)[], color: string, title: string) => {
      const data = values
        .map((v, i) =>
          v == null || !candles[i]
            ? null
            : { time: candles[i].time as UTCTimestamp, value: v }
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];
      chart
        .addLineSeries({ color, lineWidth: 1, priceLineVisible: false, title })
        .setData(data);
    };

    line(indicators.ma20, "#c9a227", "MA20");
    line(indicators.ma50, "#71717A", "MA50");

    for (const s of indicators.supports.slice(0, 2)) {
      series.createPriceLine({
        price: s.price,
        color: "rgba(14,122,87,0.7)",
        lineStyle: 2,
        lineWidth: 1,
        axisLabelVisible: true,
        title: `S ${s.touches}×`,
      });
    }
    for (const r of indicators.resistances.slice(0, 2)) {
      series.createPriceLine({
        price: r.price,
        color: "rgba(161,47,53,0.7)",
        lineStyle: 2,
        lineWidth: 1,
        axisLabelVisible: true,
        title: `R ${r.touches}×`,
      });
    }

    const rsiChart = createChart(rsiRef.current, {
      ...common,
      height: 92,
      autoSize: true,
    });
    const rsiSeries = rsiChart.addLineSeries({
      color: "#5b6f8f",
      lineWidth: 1,
      priceLineVisible: false,
      title: "RSI 14",
    });
    rsiSeries.setData(
      indicators.rsi
        .map((v, i) =>
          v == null || !candles[i]
            ? null
            : { time: candles[i].time as UTCTimestamp, value: v }
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[]
    );
    rsiSeries.createPriceLine({
      price: 70,
      color: "rgba(161,47,53,0.45)",
      lineStyle: 2,
      lineWidth: 1,
      title: "70",
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: "rgba(14,122,87,0.45)",
      lineStyle: 2,
      lineWidth: 1,
      title: "30",
    });

    const sync = (range: unknown) => {
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range as never);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(sync);
    chart.timeScale().fitContent();
    rsiChart.timeScale().fitContent();

    return () => {
      chart.remove();
      rsiChart.remove();
    };
  }, [candles, indicators]);

  const i = indicators;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="min-w-0">
        <div ref={priceRef} className="w-full" />
        <div ref={rsiRef} className="mt-1 w-full" />
      </div>

      <div className="min-w-0">
        <Stat label="Last" value={fmt(i.last, i.last >= 100 ? 2 : 4)} />
        <Stat
          label="Change (bar)"
          value={pct(i.changePct, 2)}
          tone={i.changePct >= 0 ? "green" : "red"}
        />
        <Stat
          label="Trend"
          value={i.trend}
          tone={i.trend === "uptrend" ? "green" : i.trend === "downtrend" ? "red" : undefined}
        />
        <Stat label="MA20 vs MA50" value={i.maSpreadPct != null ? pct(i.maSpreadPct, 2) : "Not enough data"} />
        <Stat label="RSI(14)" value={i.rsiLast != null ? fmt(i.rsiLast, 1) : "Not enough data"} />
        <Stat label="ATR(14)" value={i.atrPct != null ? `${i.atrPct.toFixed(2)}%` : "Not enough data"} />
        <Stat
          label="Volume vs 20-bar"
          value={i.volumeRatio != null ? `${i.volumeRatio.toFixed(2)}x` : "Not enough data"}
        />
        <Stat
          label="Support"
          value={i.supports[0] ? fmt(i.supports[0].price, 4) : "none mapped"}
        />
        <Stat
          label="Resistance"
          value={i.resistances[0] ? fmt(i.resistances[0].price, 4) : "none mapped"}
        />
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--t-muted)]">
          Native candles. Levels are swing-point clusters, sized by touch count.
        </p>
      </div>
    </div>
  );
}
