import "server-only";

import { TF_SECONDS, type AssetDef } from "./assets";
import type { Candle, CandleSet, Timeframe } from "./types";

/**
 * Market data, server-side only.
 *
 * Three real sources, tried in order, before anything synthetic:
 *   1. Binance's keyless public endpoint — crypto.
 *   2. Polygon.io — needs POLYGON_API_KEY. Official, minute-accurate, paid.
 *   3. Yahoo Finance's public chart endpoint — no key, no signup. Used only
 *      when Polygon has no key configured, so equities, FX and gold still
 *      get a real, current price rather than a guess. It is an unofficial,
 *      undocumented endpoint: it can rate-limit or change shape without
 *      notice, which is exactly why it is a fallback and not the primary.
 *
 * When none of the three answer, we fall back to deterministic sample candles
 * and set `simulated: true` — the UI badges everything downstream. We never
 * present an unmarked estimate as data.
 */

const BINANCE = "https://api.binance.com";
const POLYGON = "https://api.polygon.io";
const YAHOO = "https://query1.finance.yahoo.com";

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
 * Yahoo has no native 4h interval, so 4h is built by resampling 60m bars.
 * Ranges are picked to comfortably clear LIMIT candles after accounting for
 * equities only trading during the session, not around the clock.
 */
/**
 * Ranges are the maximum each interval will actually serve, measured rather
 * than assumed: 1d/10y returns ~2500 bars where 1d/max returns only ~170, and
 * 60m tops out at 730d for ~5100 bars.
 *
 * Depth matters more than it looks. The 70/30 split means only 30% of these
 * bars are available to trade out-of-sample, and a strategy that holds for
 * several bars produces few trades from a short series. At 1000 candles that
 * left 4-7 out-of-sample trades, under the 8-trade floor, so genuinely
 * profitable timeframes were being rejected for thin sampling alone.
 */
const YAHOO_PARAMS: Record<Timeframe, { interval: string; range: string }> = {
  "15m": { interval: "15m", range: "60d" },
  "1h": { interval: "60m", range: "730d" },
  "4h": { interval: "60m", range: "730d" },
  "1d": { interval: "1d", range: "10y" },
};

/**
 * Binance's per-request maximum. We want the long series: the out-of-sample
 * 30% has to contain enough trades to conclude anything, and a thin sample is
 * the most common reason a row gets rejected.
 */
const LIMIT = 4000;

/** Binance's hard per-request cap. More than this needs pagination. */
const BINANCE_PAGE = 1000;

/** A real bar older than this many multiples of its own timeframe means a
 *  closed market or a lagging feed, not a live-moving price. */
const STALE_BAR_MULTIPLE = 2;

function toCandleSet(
  candles: Candle[],
  simulated: boolean,
  source: string,
  timeframe: Timeframe,
  sourceDetail?: string
): CandleSet {
  const lastTime = candles[candles.length - 1]?.time ?? Math.floor(Date.now() / 1000);
  const stale =
    !simulated && Date.now() / 1000 - lastTime > TF_SECONDS[timeframe] * STALE_BAR_MULTIPLE;
  return { candles, simulated, source, sourceDetail, asOf: lastTime, stale };
}

export async function getCandles(
  asset: AssetDef,
  timeframe: Timeframe
): Promise<CandleSet> {
  if (asset.binance) {
    const candles = await fetchBinance(asset.binance, timeframe).catch(() => null);
    if (candles && candles.length > 120) {
      return toCandleSet(candles, false, "Binance", timeframe);
    }
  }

  if (asset.polygon && process.env.POLYGON_API_KEY) {
    const candles = await fetchPolygon(asset.polygon, timeframe).catch(() => null);
    if (candles && candles.length > 120) {
      return toCandleSet(candles, false, "Polygon.io", timeframe);
    }
  }

  if (asset.yahoo) {
    const candles = await fetchYahoo(asset.yahoo, timeframe).catch((err) => {
      console.error(`[cip] yahoo fetch failed for ${asset.yahoo}:`, err);
      return null;
    });
    if (candles && candles.length > 120) {
      return toCandleSet(candles, false, "Yahoo Finance", timeframe, asset.yahooProxyNote);
    }
  }

  return {
    candles: sampleCandles(asset.key, asset.seedPrice, timeframe),
    simulated: true,
    source: "sample",
    asOf: Math.floor(Date.now() / 1000),
    stale: false,
  };
}

/**
 * Peer closes for the relationship graph. Binance only — it needs no key.
 * One page each: correlation over the recent window is all the graph needs,
 * and paginating four peers would cost four times the requests for nothing.
 */
export async function getPeerCloses(
  symbols: string[],
  timeframe: Timeframe
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  const results = await Promise.all(
    symbols.map(async (s) => {
      const candles = await fetchBinance(s, timeframe, BINANCE_PAGE).catch(() => null);
      return [s, candles] as const;
    })
  );
  for (const [s, candles] of results) {
    if (candles && candles.length > 60) out[s] = candles.map((c) => c.close);
  }
  return out;
}

function parseKlines(rows: unknown[][]): Candle[] {
  return rows.map((r) => ({
    time: Math.floor(Number(r[0]) / 1000),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

/**
 * Binance caps a single klines call at 1000 bars, so anything deeper walks
 * backwards a page at a time using endTime. Pages are fetched in sequence
 * because each one's cursor depends on the previous page's oldest bar.
 */
async function fetchBinance(
  symbol: string,
  tf: Timeframe,
  want: number = LIMIT
): Promise<Candle[]> {
  const interval = BINANCE_INTERVAL[tf];
  const collected: Candle[] = [];
  let endTime: number | undefined;

  while (collected.length < want) {
    const page = Math.min(BINANCE_PAGE, want - collected.length);
    const url =
      `${BINANCE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${page}` +
      (endTime ? `&endTime=${endTime}` : "");
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`binance ${res.status}`);
    const batch = parseKlines((await res.json()) as unknown[][]);
    if (batch.length === 0) break;

    collected.unshift(...batch);
    // Step to just before this page's oldest bar for the next page.
    endTime = batch[0].time * 1000 - 1;
    // A short page means we've reached the start of the symbol's history.
    if (batch.length < page) break;
  }

  return collected.slice(-want);
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

interface YahooQuote {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
  volume?: (number | null)[];
}

interface YahooChartResponse {
  chart: {
    result?: {
      timestamp?: number[];
      indicators?: { quote?: YahooQuote[] };
    }[];
    error?: { description?: string } | null;
  };
}

/**
 * Yahoo's public, keyless chart endpoint. Unofficial and undocumented, but
 * widely relied on and, as tested, currently returns real intraday and daily
 * OHLCV for equities, FX pairs and futures with no signup required.
 */
async function fetchYahoo(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const { interval, range } = YAHOO_PARAMS[tf];
  const url =
    `${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CIP-research/1.0)" },
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const body = (await res.json()) as YahooChartResponse;
  const result = body.chart.result?.[0];
  if (!result) throw new Error(body.chart.error?.description ?? "yahoo: no result");

  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    // Yahoo pads non-trading slots with nulls rather than omitting them.
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ time: ts[i], open: o, high: h, low: l, close: c, volume: q.volume?.[i] ?? 0 });
  }

  return (tf === "4h" ? resampleHourly(candles, 4) : candles).slice(-LIMIT);
}

/** Groups consecutive hourly bars into fixed-width buckets. Yahoo has no
 *  native multi-hour interval, so 4h is built here rather than faked. */
function resampleHourly(hourly: Candle[], hours: number): Candle[] {
  const width = hours * 3600;
  const buckets = new Map<number, Candle[]>();
  for (const c of hourly) {
    const key = Math.floor(c.time / width) * width;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, group]) => ({
      time,
      open: group[0].open,
      high: Math.max(...group.map((g: Candle) => g.high)),
      low: Math.min(...group.map((g: Candle) => g.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum: number, g: Candle) => sum + g.volume, 0),
    }));
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
