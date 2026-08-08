import "server-only";

import { TF_SECONDS, type AssetDef } from "./assets";
import type { Candle, CandleSet, Timeframe } from "./types";

/**
 * Market data, server-side only.
 *
 * Crypto comes from Binance's keyless public endpoint. Equities, FX and gold
 * come from Polygon and need POLYGON_API_KEY. When a source is unavailable we
 * fall back to deterministic sample candles and set `simulated: true` — the UI
 * badges everything downstream. We never present an unmarked estimate as data.
 */

const BINANCE = "https://api.binance.com";
const POLYGON = "https://api.polygon.io";

const BINANCE_INTERVAL: Record<Timeframe, string> = {
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const POLYGON_SPAN: Record<Timeframe, [number, string]> = {
  "15m": [15, "minute"],
  "1h": [1, "hour"],
  "4h": [4, "hour"],
  "1d": [1, "day"],
};

/**
 * Binance's per-request maximum. We want the long series: the out-of-sample
 * 30% has to contain enough trades to conclude anything, and a thin sample is
 * the most common reason a row gets rejected.
 */
const LIMIT = 1000;

export async function getCandles(
  asset: AssetDef,
  timeframe: Timeframe
): Promise<CandleSet> {
  if (asset.binance) {
    const candles = await fetchBinance(asset.binance, timeframe).catch(() => null);
    if (candles && candles.length > 120) {
      return { candles, simulated: false, source: "Binance" };
    }
  }

  if (asset.polygon && process.env.POLYGON_API_KEY) {
    const candles = await fetchPolygon(asset.polygon, timeframe).catch(() => null);
    if (candles && candles.length > 120) {
      return { candles, simulated: false, source: "Polygon.io" };
    }
  }

  return {
    candles: sampleCandles(asset.key, asset.seedPrice, timeframe),
    simulated: true,
    source: "sample",
  };
}

/** Peer closes for the relationship graph. Binance only — it needs no key. */
export async function getPeerCloses(
  symbols: string[],
  timeframe: Timeframe
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  const results = await Promise.all(
    symbols.map(async (s) => {
      const candles = await fetchBinance(s, timeframe).catch(() => null);
      return [s, candles] as const;
    })
  );
  for (const [s, candles] of results) {
    if (candles && candles.length > 60) out[s] = candles.map((c) => c.close);
  }
  return out;
}

async function fetchBinance(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const url = `${BINANCE}/api/v3/klines?symbol=${symbol}&interval=${BINANCE_INTERVAL[tf]}&limit=${LIMIT}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`binance ${res.status}`);
  const rows = (await res.json()) as unknown[][];
  return rows.map((r) => ({
    time: Math.floor(Number(r[0]) / 1000),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

async function fetchPolygon(ticker: string, tf: Timeframe): Promise<Candle[]> {
  const [mult, span] = POLYGON_SPAN[tf];
  const now = Date.now();
  const from = now - TF_SECONDS[tf] * 1000 * (LIMIT + 40);
  const url =
    `${POLYGON}/v2/aggs/ticker/${ticker}/range/${mult}/${span}/${from}/${now}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${process.env.POLYGON_API_KEY}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`polygon ${res.status}`);
  const body = (await res.json()) as { results?: Record<string, number>[] };
  const rows = body.results ?? [];
  return rows
    .map((r) => ({
      time: Math.floor(r.t / 1000),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v ?? 0,
    }))
    .slice(-LIMIT);
}

/* ------------------------------------------------------------ sample data */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic sample candles: a seeded random walk with drifting volatility
 * regimes. Same asset and timeframe always produce the same series, so a demo
 * is reproducible. These are never presented as market data — every surface
 * that renders them is badged.
 */
export function sampleCandles(
  key: string,
  seedPrice: number,
  tf: Timeframe
): Candle[] {
  const rand = mulberry32(hash(`${key}:${tf}`));
  const step = TF_SECONDS[tf];
  const now = Math.floor(Date.now() / 1000 / step) * step;

  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const candles: Candle[] = [];
  let price = seedPrice * (0.86 + rand() * 0.1);
  const drift = 0.00018 + rand() * 0.0004;

  for (let i = 0; i < LIMIT; i++) {
    const regime = 0.0055 + 0.0042 * Math.sin(i / 41) ** 2;
    const change = gauss() * regime + drift;
    const open = price;
    const close = price * (1 + change);
    const wick = Math.abs(gauss()) * regime * 0.6;
    candles.push({
      time: now - step * (LIMIT - i),
      open: r(open),
      high: r(Math.max(open, close) * (1 + wick)),
      low: r(Math.min(open, close) * (1 - wick)),
      close: r(close),
      volume: r(seedPrice * (8000 + rand() * 14000) * (1 + Math.abs(change) * 22)),
    });
    price = close;
  }
  return candles;
}

function r(n: number): number {
  const abs = Math.abs(n);
  const dp = abs >= 1000 ? 2 : abs >= 10 ? 3 : abs >= 1 ? 4 : 6;
  return Number(n.toFixed(dp));
}
