import { atr, donchianUpper, rsi, sma } from "./indicators";
import type { Candle } from "./types";

/**
 * The hypothesis space.
 *
 * The engine used to test exactly one idea — a long-only Donchian breakout —
 * and report "rejected" whenever that single idea failed. That conflates two
 * very different statements: "this asset has no tradeable edge" and "the one
 * rule we happened to try has no edge here."
 *
 * So the archetypes from the product spec each get their own rule, all are
 * tested on the same candles under the same costs, and the best surviving one
 * is reported. Broadening what gets tested is legitimate; it does not touch
 * the risk gates, which stay exactly as strict. A strategy that loses money
 * after fees still gets rejected — there are simply now three chances for a
 * real edge to be found rather than one.
 *
 * Every rule here is long-only and holds for multiple bars, keeping CIP inside
 * its hours-to-days scope rather than drifting toward microstructure.
 */

export interface StrategyContext {
  candles: Candle[];
  closes: number[];
  ma20: (number | null)[];
  ma50: (number | null)[];
  dcUpper: (number | null)[];
  atr: (number | null)[];
  rsi: (number | null)[];
}

export interface StrategyDef {
  key: string;
  label: string;
  /** Plain English, shown to the user. Describes entry, exit and stop. */
  describe: string;
  /** Bars before the exit rule is allowed to fire. */
  minBars: number;
  /** Hard cap, so one winner cannot quietly become buy-and-hold. */
  maxBars: number;
  /** Stop distance as a multiple of ATR(14). */
  stopAtr: number;
  /** True when a long entry triggers on bar i (fill is the next bar's open). */
  entry: (c: StrategyContext, i: number) => boolean;
  /** True when an open position should close on bar k. */
  exit: (c: StrategyContext, k: number, bars: number) => boolean;
}

export function buildContext(candles: Candle[]): StrategyContext {
  const closes = candles.map((c) => c.close);
  return {
    candles,
    closes,
    ma20: sma(closes, 20),
    ma50: sma(closes, 50),
    dcUpper: donchianUpper(candles, 5),
    atr: atr(candles, 14),
    rsi: rsi(closes, 14),
  };
}

/** Asymmetric momentum: buy strength confirmed by the trend filter. */
const BREAKOUT: StrategyDef = {
  key: "breakout",
  label: "Momentum breakout",
  describe:
    "Enter long when price breaks above the 5-bar high while the 20-bar average sits above the 50-bar average; exit on a close back under the 20-bar average, a stop two ATR below entry, or after 14 bars.",
  minBars: 2,
  maxBars: 14,
  stopAtr: 2,
  entry: (c, i) => {
    const up = c.dcUpper[i];
    const prevUp = c.dcUpper[i - 1];
    const m20 = c.ma20[i];
    const m50 = c.ma50[i];
    if (up == null || prevUp == null || m20 == null || m50 == null) return false;
    return c.closes[i] > up && c.closes[i - 1] <= prevUp && m20 > m50;
  },
  exit: (c, k, bars) => {
    const m = c.ma20[k];
    return bars >= 2 && m != null && c.closes[k] < m;
  },
};

/** Trend following: ride the regime, not the individual breakout. */
const TREND: StrategyDef = {
  key: "trend",
  label: "Trend following",
  describe:
    "Enter long when the 20-bar average crosses above the 50-bar average; exit when it crosses back below, on a stop 2.5 ATR below entry, or after 40 bars.",
  minBars: 3,
  maxBars: 40,
  stopAtr: 2.5,
  entry: (c, i) => {
    const m20 = c.ma20[i];
    const m50 = c.ma50[i];
    const p20 = c.ma20[i - 1];
    const p50 = c.ma50[i - 1];
    if (m20 == null || m50 == null || p20 == null || p50 == null) return false;
    return p20 <= p50 && m20 > m50;
  },
  exit: (c, k, bars) => {
    const m20 = c.ma20[k];
    const m50 = c.ma50[k];
    return bars >= 3 && m20 != null && m50 != null && m20 < m50;
  },
};

/**
 * Range rotation: buy the pullback inside an intact uptrend.
 *
 * Defined as a dip under MA20 that price then reclaims, rather than as an RSI
 * oversold reading. Oversold was measured and does not work here: requiring
 * price above MA50 already restricts entries to uptrends, and inside an
 * uptrend RSI(14) essentially never reaches those levels — RSI below 40 with
 * that filter produced a single entry in ten years of AAPL, and below 32 none
 * at all. A rule that never fires reports as "no edge" when the truth is that
 * it was never tested. The reclaim formulation fires 49-61 times across the
 * same history, which is a hypothesis the engine can actually evaluate.
 */
const REVERSION: StrategyDef = {
  key: "reversion",
  label: "Range rotation",
  describe:
    "Enter long when price dips below the 20-bar average and closes back above it while the 20-bar average still sits above the 50-bar average, buying a pullback inside an intact uptrend; exit on a close below the 50-bar average, an RSI(14) reading above 70, a stop two ATR below entry, or after 20 bars.",
  minBars: 2,
  maxBars: 20,
  stopAtr: 2,
  entry: (c, i) => {
    const m20 = c.ma20[i];
    const p20 = c.ma20[i - 1];
    const m50 = c.ma50[i];
    if (m20 == null || p20 == null || m50 == null) return false;
    return m20 > m50 && c.closes[i - 1] < p20 && c.closes[i] > m20;
  },
  exit: (c, k, bars) => {
    if (bars < 2) return false;
    const m50 = c.ma50[k];
    const r = c.rsi[k];
    if (m50 != null && c.closes[k] < m50) return true;
    return r != null && r > 70;
  },
};

export const STRATEGIES: StrategyDef[] = [BREAKOUT, TREND, REVERSION];
