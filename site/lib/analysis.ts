import type { Candle, Indicators, McSummary } from "./types";

/**
 * The desk metrics: participation, structure, momentum, volatility and the two
 * risk readings that decide whether a setup is sizeable at all.
 *
 * Everything here is computed from the same candle series the chart draws, so
 * a number in these panels can never disagree with the one above it. Nothing
 * is estimated and nothing is passed to a model — the model only ever gets to
 * describe what this file produced.
 */

/* ------------------------------------------------------------------ volume */

export interface VolumeAnalysis {
  /** Recent volume as a multiple of the trailing 20-bar mean, for the bars. */
  series: number[];
  /** Up-bar or down-bar, aligned with `series`, so conviction has a direction. */
  directions: ("up" | "down")[];
  latestRatio: number | null;
  meanRatio: number | null;
  /** Share of recent volume that traded on up bars. */
  upVolumeShare: number | null;
  conviction: "high" | "moderate" | "low" | "unavailable";
}

export function analyseVolume(candles: Candle[], lookback = 30): VolumeAnalysis {
  const w = candles.slice(-lookback);
  const empty: VolumeAnalysis = {
    series: [],
    directions: [],
    latestRatio: null,
    meanRatio: null,
    upVolumeShare: null,
    conviction: "unavailable",
  };
  // Several sources report zero volume for spot FX; say so rather than divide
  // by it and print a confident nonsense ratio.
  if (w.length < 21 || w.every((c) => c.volume <= 0)) return empty;

  const series: number[] = [];
  const directions: ("up" | "down")[] = [];
  for (let i = 0; i < w.length; i++) {
    const abs = candles.length - w.length + i;
    const prior = candles.slice(Math.max(0, abs - 20), abs);
    const avg = prior.reduce((a, c) => a + c.volume, 0) / Math.max(1, prior.length);
    series.push(avg > 0 ? Number((w[i].volume / avg).toFixed(3)) : 0);
    directions.push(w[i].close >= w[i].open ? "up" : "down");
  }

  const upVol = w.reduce((a, c) => a + (c.close >= c.open ? c.volume : 0), 0);
  const totalVol = w.reduce((a, c) => a + c.volume, 0);
  const meanRatio = series.reduce((a, b) => a + b, 0) / series.length;
  const latestRatio = series[series.length - 1];

  // Conviction is participation and direction together: heavy volume that is
  // mostly distribution is not confirmation, so both have to agree.
  const share = totalVol > 0 ? upVol / totalVol : 0;
  let conviction: VolumeAnalysis["conviction"] = "moderate";
  if (latestRatio >= 1.25 && (share >= 0.6 || share <= 0.4)) conviction = "high";
  else if (latestRatio < 0.8) conviction = "low";

  return {
    series,
    directions,
    latestRatio: Number(latestRatio.toFixed(2)),
    meanRatio: Number(meanRatio.toFixed(2)),
    upVolumeShare: Number(share.toFixed(3)),
    conviction,
  };
}

/* ------------------------------------------------------------- zones (S/R) */

export interface Zone {
  price: number;
  touches: number;
  /** Signed distance from the last close, in percent. */
  distancePct: number;
}

export interface ZoneAnalysis {
  zones: Zone[];
  nearest: Zone | null;
  /** Price span the zones cover, for drawing them to scale. */
  domain: [number, number];
  last: number;
}

function toZones(levels: { price: number; touches: number }[], last: number): Zone[] {
  return levels.map((l) => ({
    price: l.price,
    touches: l.touches,
    distancePct: Number((((l.price - last) / last) * 100).toFixed(2)),
  }));
}

export function analyseZones(indicators: Indicators): {
  support: ZoneAnalysis;
  resistance: ZoneAnalysis;
} {
  const last = indicators.last;
  const sup = toZones(indicators.supports, last);
  const res = toZones(indicators.resistances, last);

  const span = (zs: Zone[]): [number, number] => {
    const prices = [...zs.map((z) => z.price), last];
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = (hi - lo) * 0.12 || last * 0.01;
    return [lo - pad, hi + pad];
  };

  return {
    support: { zones: sup, nearest: sup[0] ?? null, domain: span(sup), last },
    resistance: { zones: res, nearest: res[0] ?? null, domain: span(res), last },
  };
}

/* ---------------------------------------------------------------- momentum */

export interface MomentumAnalysis {
  rsi: number | null;
  /** Rate of change over the lookback, percent. */
  rocPct: number | null;
  /** Change in ROC against the prior window: momentum of the momentum. */
  accelerationPct: number | null;
  series: number[];
  state: "expanding" | "steady" | "fading" | "unavailable";
}

export function analyseMomentum(candles: Candle[], indicators: Indicators, span = 10): MomentumAnalysis {
  const closes = candles.map((c) => c.close);
  if (closes.length < span * 4) {
    return { rsi: indicators.rsiLast, rocPct: null, accelerationPct: null, series: [], state: "unavailable" };
  }

  const rocAt = (i: number) => ((closes[i] - closes[i - span]) / closes[i - span]) * 100;
  const series: number[] = [];
  for (let i = closes.length - 40; i < closes.length; i++) {
    if (i - span >= 0) series.push(Number(rocAt(i).toFixed(3)));
  }

  const rocPct = rocAt(closes.length - 1);
  const priorRoc = rocAt(closes.length - 1 - span);
  const accelerationPct = rocPct - priorRoc;

  let state: MomentumAnalysis["state"] = "steady";
  if (Math.abs(accelerationPct) < 0.35) state = "steady";
  else if (accelerationPct > 0) state = "expanding";
  else state = "fading";

  return {
    rsi: indicators.rsiLast,
    rocPct: Number(rocPct.toFixed(2)),
    accelerationPct: Number(accelerationPct.toFixed(2)),
    series,
    state,
  };
}

/* -------------------------------------------------------------- volatility */

export interface VolatilityAnalysis {
  atrPct: number | null;
  /** Where current ATR sits within its own history, 0..1. */
  percentile: number | null;
  regime: "compressed" | "normal" | "elevated" | "unavailable";
  series: number[];
}

export function analyseVolatility(candles: Candle[], indicators: Indicators): VolatilityAnalysis {
  const atrPct = indicators.atrPct;
  if (atrPct == null || candles.length < 80) {
    return { atrPct, percentile: null, regime: "unavailable", series: [] };
  }

  // True range as a share of price, bar by bar — the same quantity ATR smooths,
  // used here to place today's reading inside its own distribution.
  const trPct: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1].close;
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
    trPct.push((tr / c.close) * 100);
  }

  const sorted = [...trPct].sort((a, b) => a - b);
  const below = sorted.filter((v) => v <= atrPct).length;
  const percentile = below / sorted.length;

  const regime: VolatilityAnalysis["regime"] =
    percentile >= 0.75 ? "elevated" : percentile <= 0.3 ? "compressed" : "normal";

  return {
    atrPct,
    percentile: Number(percentile.toFixed(3)),
    regime,
    series: trPct.slice(-60).map((v) => Number(v.toFixed(3))),
  };
}

/* ----------------------------------------------------- exposure and sizing */

/**
 * Platform risk policy. Hardcoded here, never derived from a prompt and never
 * overridable by a model — the same rule as the risk gates.
 */
export const RISK_POLICY = {
  /** Share of the simulated account risked on a single trade. */
  riskPerTradePct: 1,
  /** Ceiling on any one position regardless of how tight its stop is. */
  maxPositionPct: 25,
  /** Ceiling on total simulated exposure at any moment. */
  maxTotalExposurePct: 100,
};

export interface ExposureAnalysis {
  /** Share of the out-of-sample window the strategy actually held a position. */
  share: number;
  utilisationPct: number;
  withinPolicy: boolean;
}

export function analyseExposure(summary: McSummary): ExposureAnalysis {
  const utilisationPct = summary.exposureShare * 100;
  return {
    share: summary.exposureShare,
    utilisationPct: Number(utilisationPct.toFixed(1)),
    withinPolicy: utilisationPct <= RISK_POLICY.maxTotalExposurePct,
  };
}

export interface PositionSizing {
  /** 2 x ATR below entry, as a percent of price. */
  stopDistancePct: number | null;
  /** Size that puts exactly riskPerTradePct at risk at that stop. */
  rawSizePct: number | null;
  /** After the position cap is applied. */
  sizePct: number | null;
  cappedByPolicy: boolean;
  riskPerTradePct: number;
  maxPositionPct: number;
}

/**
 * Size from the stop, not from conviction. Risk a fixed share of the account
 * per trade and let the stop distance decide how large the position can be,
 * which is what keeps a volatile asset from quietly carrying more risk than a
 * calm one at the same notional.
 */
export function analysePositionSize(
  indicators: Indicators,
  stopAtrMultiple: number
): PositionSizing {
  const base: PositionSizing = {
    stopDistancePct: null,
    rawSizePct: null,
    sizePct: null,
    cappedByPolicy: false,
    riskPerTradePct: RISK_POLICY.riskPerTradePct,
    maxPositionPct: RISK_POLICY.maxPositionPct,
  };
  if (indicators.atrPct == null || indicators.atrPct <= 0) return base;

  const stopDistancePct = indicators.atrPct * stopAtrMultiple;
  const rawSizePct = (RISK_POLICY.riskPerTradePct / stopDistancePct) * 100;
  const sizePct = Math.min(rawSizePct, RISK_POLICY.maxPositionPct);

  return {
    ...base,
    stopDistancePct: Number(stopDistancePct.toFixed(2)),
    rawSizePct: Number(rawSizePct.toFixed(1)),
    sizePct: Number(sizePct.toFixed(1)),
    cappedByPolicy: rawSizePct > RISK_POLICY.maxPositionPct,
  };
}

/* -------------------------------------------------------------- aggregate */

export interface DeskAnalysis {
  volume: VolumeAnalysis;
  support: ZoneAnalysis;
  resistance: ZoneAnalysis;
  momentum: MomentumAnalysis;
  volatility: VolatilityAnalysis;
  exposure: ExposureAnalysis;
  sizing: PositionSizing;
}

export function analyseDesk(
  candles: Candle[],
  indicators: Indicators,
  summary: McSummary,
  stopAtrMultiple: number
): DeskAnalysis {
  const zones = analyseZones(indicators);
  return {
    volume: analyseVolume(candles),
    support: zones.support,
    resistance: zones.resistance,
    momentum: analyseMomentum(candles, indicators),
    volatility: analyseVolatility(candles, indicators),
    exposure: analyseExposure(summary),
    sizing: analysePositionSize(indicators, stopAtrMultiple),
  };
}
