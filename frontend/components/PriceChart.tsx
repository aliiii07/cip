"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { AssetAnalysis } from "@/lib/api";

function lineData(times: number[], values: (number | null)[]) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  values.forEach((v, i) => {
    if (v !== null) out.push({ time: times[i] as UTCTimestamp, value: v });
  });
  return out;
}

export function PriceChart({ analysis }: { analysis: AssetAnalysis }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mainRef.current || !rsiRef.current) return;
    const common = {
      layout: {
        background: { type: ColorType.Solid, color: "#FAFAF8" },
        textColor: "#6B6860",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(60,58,52,0.06)" },
        horzLines: { color: "rgba(60,58,52,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(60,58,52,0.12)" },
      timeScale: { borderColor: "rgba(60,58,52,0.12)", timeVisible: true },
      crosshair: { mode: 0 as const },
    };

    const chart: IChartApi = createChart(mainRef.current, {
      ...common,
      height: 420,
      autoSize: true,
    });
    const times = analysis.candles.map((c) => c.time);

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#2E7D4F",
      downColor: "#B03A2E",
      wickUpColor: "#2E7D4F",
      wickDownColor: "#B03A2E",
      borderVisible: false,
    });
    candleSeries.setData(
      analysis.candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    chart
      .addLineSeries({ color: "#C07B3A", lineWidth: 2, priceLineVisible: false, title: "EMA 50" })
      .setData(lineData(times, analysis.series.ema50));
    chart
      .addLineSeries({ color: "#6B6860", lineWidth: 2, priceLineVisible: false, title: "EMA 200" })
      .setData(lineData(times, analysis.series.ema200));
    chart
      .addLineSeries({
        color: "rgba(58,95,192,0.45)",
        lineWidth: 1,
        priceLineVisible: false,
        title: "Donchian 20",
      })
      .setData(lineData(times, analysis.series.donchian_upper));
    chart
      .addLineSeries({ color: "rgba(58,95,192,0.45)", lineWidth: 1, priceLineVisible: false })
      .setData(lineData(times, analysis.series.donchian_lower));

    for (const s of analysis.levels.supports.slice(0, 2)) {
      candleSeries.createPriceLine({
        price: s.level,
        color: "rgba(46,125,79,0.55)",
        lineStyle: 2,
        lineWidth: 1,
        title: `S ${s.touches}×`,
      });
    }
    for (const r of analysis.levels.resistances.slice(0, 2)) {
      candleSeries.createPriceLine({
        price: r.level,
        color: "rgba(176,58,46,0.55)",
        lineStyle: 2,
        lineWidth: 1,
        title: `R ${r.touches}×`,
      });
    }

    const volumeSeries = chart.addHistogramSeries({
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeSeries.setData(
      analysis.candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(46,125,79,0.35)" : "rgba(176,58,46,0.35)",
      }))
    );

    const rsiChart = createChart(rsiRef.current, { ...common, height: 120, autoSize: true });
    const rsiSeries = rsiChart.addLineSeries({
      color: "#3A5FC0",
      lineWidth: 2,
      priceLineVisible: false,
      title: "RSI 14",
    });
    rsiSeries.setData(lineData(times, analysis.series.rsi));
    rsiSeries.createPriceLine({ price: 70, color: "rgba(176,58,46,0.4)", lineStyle: 2, lineWidth: 1, title: "70" });
    rsiSeries.createPriceLine({ price: 30, color: "rgba(46,125,79,0.4)", lineStyle: 2, lineWidth: 1, title: "30" });

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
  }, [analysis]);

  return (
    <div>
      <div ref={mainRef} className="w-full" />
      <div ref={rsiRef} className="mt-1 w-full" />
    </div>
  );
}
