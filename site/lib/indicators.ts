import type { Candle, Indicators, Level } from "./types";

/**
 * Deterministic technical indicators over native OHLCV candles.
 *
 * Native candles only. No Heikin-Ashi, no smoothing of the price series before
 * it reaches these functions — that is the first of the four death traps and it
 * is rejected at the data layer, not here.
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let total = 0;
  for (let i = 0; i < period; i++) total += values[i];
  out[period - 1] = total / period;
  for (let i = period; i < values.length; i++) {
    total += values[i] - values[i - period];
    out[i] = total / period;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  const value = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out[period] = value(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = value(avgGain, avgLoss);
  }
  return out;
}

/** Wilder's ATR over true range. */
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;

  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    tr.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      )
    );
  }

  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i - 1]) / period;
    out[i] = prev;
  }
  return out;
}

/**
 * Prior-N-bar Donchian channel, excluding the current bar — so "close crosses
 * above the upper band" is actually detectable. A close can never exceed the
 * high of its own bar.
 */
export function donchianUpper(candles: Candle[], period = 20): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period; i < candles.length; i++) {
    let hi = -Infinity;
    for (let j = i - period; j < i; j++) hi = Math.max(hi, candles[j].high);
    out[i] = hi;
  }
  return out;
}

/** Swing-point clustering: local extremes with 2-bar wings, merged by proximity. */
export function supportResistance(
  candles: Candle[],
  lookback = 140,
  tolerancePct = 0.6
): { supports: Level[]; resistances: Level[] } {
  const w = candles.slice(-lookback);
  const swings: number[] = [];

  for (let i = 2; i < w.length - 2; i++) {
    const highs = [w[i - 2].high, w[i - 1].high, w[i + 1].high, w[i + 2].high];
    const lows = [w[i - 2].low, w[i - 1].low, w[i + 1].low, w[i + 2].low];
    if (w[i].high > Math.max(...highs)) swings.push(w[i].high);
    if (w[i].low < Math.min(...lows)) swings.push(w[i].low);
  }

  const clusters: { level: number; prices: number[] }[] = [];
  for (const price of swings.sort((a, b) => a - b)) {
    const hit = clusters.find(
      (c) => Math.abs(price - c.level) / c.level * 100 <= tolerancePct
    );
    if (hit) {
      hit.prices.push(price);
      hit.level = hit.prices.reduce((a, b) => a + b, 0) / hit.prices.length;
    } else {
      clusters.push({ level: price, prices: [price] });
    }
  }

  const last = candles[candles.length - 1].close;
  const toLevel = (c: { level: number; prices: number[] }): Level => ({
    price: round(c.level),
    touches: c.prices.length,
  });

  return {
    supports: clusters
      .filter((c) => c.level < last)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4)
      .map(toLevel),
    resistances: clusters
      .filter((c) => c.level > last)
      .sort((a, b) => a.level - b.level)
      .slice(0, 4)
      .map(toLevel),
  };
}

function round(n: number): number {
  const abs = Math.abs(n);
  const dp = abs >= 1000 ? 2 : abs >= 10 ? 3 : abs >= 1 ? 4 : 6;
  return Number(n.toFixed(dp));
}

export function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atr(candles, 14);

  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2] ?? last;
  const m20 = ma20[ma20.length - 1];
  const m50 = ma50[ma50.length - 1];
  const atrLast = atrSeries[atrSeries.length - 1];

  const maSpreadPct = m20 != null && m50 != null ? ((m20 - m50) / m50) * 100 : null;
  let trend: Indicators["trend"] = "ranging";
  if (maSpreadPct != null) {
    if (maSpreadPct > 0.35) trend = "uptrend";
    else if (maSpreadPct < -0.35) trend = "downtrend";
  }

  // Latest bar's volume against the mean of the prior 20 bars.
  let volumeRatio: number | null = null;
  if (candles.length > 21) {
    const prior = candles.slice(-21, -1);
    const avg = prior.reduce((a, c) => a + c.volume, 0) / prior.length;
    volumeRatio = avg > 0 ? candles[candles.length - 1].volume / avg : null;
  }

  const { supports, resistances } = supportResistance(candles);

  return {
    last: round(last),
    changePct: Number((((last - prev) / prev) * 100).toFixed(2)),
    ma20,
    ma50,
    rsi: rsiSeries,
    rsiLast: rsiSeries[rsiSeries.length - 1],
    atrLast: atrLast != null ? round(atrLast) : null,
    atrPct: atrLast != null ? Number(((atrLast / last) * 100).toFixed(2)) : null,
    volumeRatio: volumeRatio != null ? Number(volumeRatio.toFixed(2)) : null,
    trend,
    maSpreadPct: maSpreadPct != null ? Number(maSpreadPct.toFixed(2)) : null,
    supports,
    resistances,
  };
}
