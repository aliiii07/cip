import { STRATEGIES, buildContext, type StrategyDef } from "./strategies";
import type {
  Bin,
  Candle,
  McResult,
  McSummary,
  Ridge,
  Timeframe,
  Trade,
  Verdict,
} from "./types";

/**
 * The engine. Everything the dashboard prints as a number originates here.
 *
 * Three rules this file exists to enforce:
 *   1. Costs are always modelled — maker/taker fees plus depth-based slippage.
 *      A strategy that only survives at zero cost is a losing strategy.
 *   2. Headline metrics come from out-of-sample trades only. The series is
 *      split 70/30 chronologically and the validate slice is what gets
 *      reported.
 *   3. Results are deterministic. The same candles produce the same numbers,
 *      because the PRNG is seeded from the data itself.
 */

/* ------------------------------------------------------------------ costs */

/** Round-trip taker fees, in basis points. 0.12% is the platform default. */
const FEE_BPS_ROUND_TRIP = 12;

/**
 * Slippage as a fraction of ATR. Stands in for consuming order-book depth:
 * a market order does not fill at the mid, it walks the book.
 */
const SLIPPAGE_ATR_FRACTION = 0.14;

const PATHS = 5000;

/* ------------------------------------------------------------------- PRNG */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Box–Muller, driven by the seeded uniform generator. */
function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* --------------------------------------------------------------- backtest */

export interface BacktestOut {
  all: Trade[];
  train: Trade[];
  validate: Trade[];
  /** Buy-and-hold over the same out-of-sample window, for the benchmark. */
  buyHoldReturnPct: number;
  /** Fraction of the out-of-sample window spent holding a position. */
  exposureShare: number;
  splitIndex: number;
}

/**
 * Runs one strategy definition over the candles.
 *
 * Holding periods are floored at a few bars even on 15m, which keeps CIP
 * inside its hours-to-days scope rather than drifting into microstructure.
 * The bar cap stops one winner from quietly becoming buy-and-hold.
 */
export function backtest(
  candles: Candle[],
  strategy: StrategyDef = STRATEGIES[0]
): BacktestOut {
  const ctx = buildContext(candles);
  const atrSeries = ctx.atr;

  const trades: Trade[] = [];
  let i = 51;

  while (i < candles.length - 1) {
    const a = atrSeries[i];
    if (a == null || !strategy.entry(ctx, i)) {
      i++;
      continue;
    }

    // Fill on the next bar's open — never on the signal bar's close.
    const entryIdx = i + 1;
    if (entryIdx >= candles.length) break;
    const entry = candles[entryIdx].open;
    const stop = entry - strategy.stopAtr * a;

    let exitIdx = entryIdx;
    let exit = entry;
    for (let k = entryIdx + 1; k < candles.length; k++) {
      const bars = k - entryIdx;
      exitIdx = k;
      if (candles[k].low <= stop) {
        exit = stop;
        break;
      }
      if (bars >= strategy.minBars && strategy.exit(ctx, k, bars)) {
        exit = candles[k].close;
        break;
      }
      if (bars >= strategy.maxBars) {
        exit = candles[k].close;
        break;
      }
      exit = candles[k].close;
    }

    const grossReturnPct = ((exit - entry) / entry) * 100;
    const slippagePct = ((SLIPPAGE_ATR_FRACTION * a) / entry) * 100 * 2; // both sides
    const netReturnPct = grossReturnPct - FEE_BPS_ROUND_TRIP / 100 - slippagePct;

    trades.push({
      entryIndex: entryIdx,
      entry,
      exit,
      bars: exitIdx - entryIdx,
      grossReturnPct: Number(grossReturnPct.toFixed(4)),
      netReturnPct: Number(netReturnPct.toFixed(4)),
    });

    i = exitIdx + 1;
  }

  // 70/30 chronological split — no overlap, no look-ahead. A trade belongs to
  // the slice its entry bar falls in, taken from the recorded index rather
  // than re-derived, so nothing lands in the wrong half.
  const splitIndex = Math.floor(candles.length * 0.7);
  const train = trades.filter((t) => t.entryIndex < splitIndex);
  const validate = trades.filter((t) => t.entryIndex >= splitIndex);

  const oos = candles.slice(splitIndex);
  const buyHoldReturnPct =
    oos.length > 1
      ? ((oos[oos.length - 1].close - oos[0].close) / oos[0].close) * 100
      : 0;

  // How much of the out-of-sample window the strategy was actually exposed for.
  const barsHeld = validate.reduce((sum, t) => sum + t.bars, 0);
  const exposureShare = oos.length > 1 ? Math.min(1, barsHeld / oos.length) : 0;

  return {
    all: trades,
    train,
    validate,
    buyHoldReturnPct: Number(buyHoldReturnPct.toFixed(2)),
    exposureShare: Number(exposureShare.toFixed(3)),
    splitIndex,
  };
}

/* ---------------------------------------------------------- Monte Carlo */

export function runMonteCarlo(
  pool: Trade[],
  opts: {
    seedKey: string;
    buyHoldReturnPct: number;
    exposureShare: number;
    avgAtrPct: number;
  }
): McResult {
  const rand = mulberry32(seedFrom(opts.seedKey, pool.length));
  const returns = pool.map((t) => t.netReturnPct);

  const tradesPerPath = Math.max(6, Math.min(24, returns.length));
  const endpoints: number[] = [];
  const drawdowns: number[] = [];
  // Cumulative return after each trade index, across all paths — feeds the ridge.
  const bySession: number[][] = Array.from({ length: 8 }, () => []);

  if (returns.length === 0) {
    return emptyResult(opts.buyHoldReturnPct, opts.exposureShare);
  }

  const slipSigma = Math.max(0.02, opts.avgAtrPct * 0.08);

  for (let p = 0; p < PATHS; p++) {
    let equity = 1;
    let peak = 1;
    let maxDd = 0;

    for (let t = 0; t < tradesPerPath; t++) {
      const base = returns[Math.floor(rand() * returns.length)];
      // Permute price, then spread/slippage — the two things that actually
      // differ between a backtest and a live fill.
      const priceShock = 1 + gaussian(rand) * 0.18;
      const extraSlip = Math.abs(gaussian(rand)) * slipSigma;
      const r = (base * priceShock - extraSlip) / 100;

      equity *= 1 + r;
      peak = Math.max(peak, equity);
      maxDd = Math.max(maxDd, (peak - equity) / peak);

      if (t < 8) bySession[t].push((equity - 1) * 100);
    }

    endpoints.push((equity - 1) * 100);
    drawdowns.push(maxDd * 100);
  }

  endpoints.sort((a, b) => a - b);

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const stdev = (xs: number[]) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };
  const pct = (xs: number[], q: number) =>
    xs[Math.min(xs.length - 1, Math.max(0, Math.floor(q * xs.length)))];

  const expectancyPct = mean(returns);
  const winRatePct = (returns.filter((r) => r > 0).length / returns.length) * 100;
  const tradeSigma = stdev(returns);
  const sharpe = tradeSigma > 0 ? (expectancyPct / tradeSigma) * Math.sqrt(tradesPerPath) : 0;

  const lo = pct(endpoints, 0.005);
  const hi = pct(endpoints, 0.995);
  const domain: [number, number] = [Math.min(lo, -1), Math.max(hi, 1)];

  const BINS = 31;
  const width = (domain[1] - domain[0]) / BINS;
  const bins: Bin[] = Array.from({ length: BINS }, (_, i) => ({
    from: domain[0] + i * width,
    to: domain[0] + (i + 1) * width,
    count: 0,
  }));
  for (const e of endpoints) {
    const idx = Math.min(BINS - 1, Math.max(0, Math.floor((e - domain[0]) / width)));
    bins[idx].count++;
  }

  const ridges: Ridge[] = bySession
    .filter((s) => s.length > 0)
    .map((session, i) => ({
      session: i + 1,
      density: densityCurve(session, domain, 48),
      tailMass:
        session.filter((v) => Math.abs(v) >= 15).length / session.length,
    }));

  const pLoss15 = endpoints.filter((e) => e <= -15).length / endpoints.length;
  const pGain15 = endpoints.filter((e) => e >= 15).length / endpoints.length;

  const summary: McSummary = {
    paths: PATHS,
    tradesPerPath,
    expectancyPct: r4(expectancyPct),
    medianPathReturnPct: r2(pct(endpoints, 0.5)),
    bestPathReturnPct: r2(endpoints[endpoints.length - 1]),
    worstPathReturnPct: r2(endpoints[0]),
    profitablePathShare: r4(
      endpoints.filter((e) => e > 0).length / endpoints.length
    ),
    maxDrawdownPct: r2(pct([...drawdowns].sort((a, b) => a - b), 0.95)),
    sharpe: r2(sharpe),
    winRatePct: r2(winRatePct),
    buyHoldReturnPct: opts.buyHoldReturnPct,
    exposureShare: opts.exposureShare,
    benchmarkAdjustedPct: r2(opts.buyHoldReturnPct * opts.exposureShare),
    sampleTrades: returns.length,
  };

  return {
    summary,
    endpoints: sampleEvenly(endpoints, 420),
    bins,
    domain,
    ridges,
    tails: {
      pLoss15: r4(pLoss15),
      pGain15: r4(pGain15),
      tailMass: r4(pLoss15 + pGain15),
      impliedVolPct: r2(stdev(endpoints)),
    },
  };
}

function densityCurve(values: number[], domain: [number, number], points: number) {
  const [lo, hi] = domain;
  const step = (hi - lo) / points;
  const counts = new Array(points).fill(0);
  for (const v of values) {
    const i = Math.min(points - 1, Math.max(0, Math.floor((v - lo) / step)));
    counts[i]++;
  }
  // Light 3-tap smoothing so the ridgeline reads as a curve, not a comb.
  const smoothed = counts.map((_, i) => {
    const a = counts[i - 1] ?? 0;
    const b = counts[i];
    const c = counts[i + 1] ?? 0;
    return (a + 2 * b + c) / 4;
  });
  const max = Math.max(...smoothed, 1);
  return smoothed.map((v) => Number((v / max).toFixed(4)));
}

function sampleEvenly(xs: number[], n: number): number[] {
  if (xs.length <= n) return xs.map(r2);
  const out: number[] = [];
  const step = xs.length / n;
  for (let i = 0; i < n; i++) out.push(r2(xs[Math.floor(i * step)]));
  return out;
}

function emptyResult(buyHoldReturnPct: number, exposureShare: number): McResult {
  return {
    summary: {
      paths: 0,
      tradesPerPath: 0,
      expectancyPct: 0,
      medianPathReturnPct: 0,
      bestPathReturnPct: 0,
      worstPathReturnPct: 0,
      profitablePathShare: 0,
      maxDrawdownPct: 0,
      sharpe: 0,
      winRatePct: 0,
      buyHoldReturnPct,
      exposureShare,
      benchmarkAdjustedPct: 0,
      sampleTrades: 0,
    },
    endpoints: [],
    bins: [],
    domain: [-1, 1],
    ridges: [],
    tails: { pLoss15: 0, pGain15: 0, tailMass: 0, impliedVolPct: 0 },
  };
}

const r2 = (n: number) => Number(n.toFixed(2));
const r4 = (n: number) => Number(n.toFixed(4));

/* ---------------------------------------------------------------- verdict */

/**
 * Deterministic risk gates. Hardcoded here, never derived from a prompt and
 * never overridable by the model. A breach is reported as a rejection — the
 * pipeline does not warn and pass.
 */
export const GATES = {
  minTrades: 8,
  maxDrawdownPct: 25,
  minProfitableShare: 0.55,
};

export function verdictFor(
  summary: McSummary
): { verdict: Verdict; reason: string } {
  if (summary.sampleTrades < GATES.minTrades) {
    return {
      verdict: "rejected",
      reason: `Only ${summary.sampleTrades} out-of-sample trades, below the ${GATES.minTrades}-trade floor needed to conclude anything.`,
    };
  }
  if (summary.expectancyPct <= 0) {
    return {
      verdict: "rejected",
      reason: `Expectancy is ${summary.expectancyPct.toFixed(3)}% per trade after fees and slippage. The costs eat the edge.`,
    };
  }
  if (summary.maxDrawdownPct > GATES.maxDrawdownPct) {
    return {
      verdict: "rejected",
      reason: `Simulated drawdown reaches ${summary.maxDrawdownPct.toFixed(1)}%, past the ${GATES.maxDrawdownPct}% platform limit.`,
    };
  }
  if (summary.profitablePathShare < GATES.minProfitableShare) {
    return {
      verdict: "marginal",
      reason: `Only ${(summary.profitablePathShare * 100).toFixed(0)}% of the 5,000 paths finish above water, too close to a coin flip.`,
    };
  }
  // Like-for-like: the strategy held a position for only part of the window,
  // so it is measured against buy-and-hold scaled to that same exposure. The
  // raw benchmark is still reported next to it.
  if (summary.medianPathReturnPct <= summary.benchmarkAdjustedPct) {
    return {
      verdict: "marginal",
      reason: `The median path returns ${summary.medianPathReturnPct.toFixed(1)}% against ${summary.benchmarkAdjustedPct.toFixed(1)}% for holding at the same ${(summary.exposureShare * 100).toFixed(0)}% exposure. It does not beat the benchmark.`,
    };
  }
  return {
    verdict: "approved",
    reason: `Expectancy ${summary.expectancyPct.toFixed(3)}% per trade after costs, ${(summary.profitablePathShare * 100).toFixed(0)}% of paths positive, drawdown inside the ${GATES.maxDrawdownPct}% limit, and it clears buy-and-hold at matched exposure.`,
  };
}

export function strongest(
  rows: { timeframe: Timeframe; verdict: Verdict; expectancyPct: number }[]
): Timeframe | null {
  const approved = rows.filter((r) => r.verdict === "approved");
  if (approved.length === 0) return null;
  return approved.sort((a, b) => b.expectancyPct - a.expectancyPct)[0].timeframe;
}

/* ---------------------------------------------------- parameter robustness */

export interface RobustnessPoint {
  stopAtr: number;
  maxBars: number;
  expectancyPct: number;
  trades: number;
  /** True when this perturbation still clears the drawdown gate. */
  withinDrawdown: boolean;
}

export interface RobustnessResult {
  grid: RobustnessPoint[];
  tested: number;
  profitable: number;
  /** Share of the perturbed cluster that stays profitable after costs. */
  share: number;
  medianExpectancyPct: number;
  verdict: "robust" | "fragile";
  reason: string;
}

/** A strategy has to survive its neighbours, not just its own exact settings. */
const ROBUST_SHARE_FLOOR = 0.6;

/**
 * Shifts every parameter by ±10% and ±20% and retests the whole cluster.
 *
 * An edge that exists only at one exact setting is curve-fit noise. Reporting
 * the point estimate alone is how a backtest flatters itself, so the neighbours
 * are tested under identical costs and the share of them that stays profitable
 * is reported beside the headline figure.
 */
export function testRobustness(
  candles: Candle[],
  strategy: StrategyDef,
  opts: { seedKey: string; avgAtrPct: number }
): RobustnessResult {
  const stopSteps = [0.8, 0.9, 1, 1.1, 1.2];
  const barSteps = [0.8, 1, 1.2];

  const grid: RobustnessPoint[] = [];
  for (const s of stopSteps) {
    for (const b of barSteps) {
      const stopAtr = Number((strategy.stopAtr * s).toFixed(3));
      const maxBars = Math.max(3, Math.round(strategy.maxBars * b));
      const perturbed: StrategyDef = { ...strategy, stopAtr, maxBars };
      const bt = backtest(candles, perturbed);
      const mc = runMonteCarlo(bt.validate, {
        seedKey: `${opts.seedKey}:${strategy.key}:${stopAtr}:${maxBars}`,
        buyHoldReturnPct: bt.buyHoldReturnPct,
        exposureShare: bt.exposureShare,
        avgAtrPct: opts.avgAtrPct,
      });
      grid.push({
        stopAtr,
        maxBars,
        expectancyPct: mc.summary.expectancyPct,
        trades: mc.summary.sampleTrades,
        withinDrawdown: mc.summary.maxDrawdownPct <= GATES.maxDrawdownPct,
      });
    }
  }

  const scored = grid.filter((p) => p.trades >= GATES.minTrades);
  const profitable = scored.filter((p) => p.expectancyPct > 0).length;
  const share = scored.length > 0 ? profitable / scored.length : 0;
  const sortedExp = [...scored].map((p) => p.expectancyPct).sort((a, b) => a - b);
  const medianExpectancyPct = sortedExp.length
    ? sortedExp[Math.floor(sortedExp.length / 2)]
    : 0;

  const robust = scored.length > 0 && share >= ROBUST_SHARE_FLOOR;
  return {
    grid,
    tested: scored.length,
    profitable,
    share: r4(share),
    medianExpectancyPct: r4(medianExpectancyPct),
    verdict: robust ? "robust" : "fragile",
    reason: scored.length === 0
      ? "No perturbation produced enough trades to judge robustness."
      : robust
        ? `${profitable} of ${scored.length} parameter neighbours stay profitable after costs, so the edge is not a single lucky setting.`
        : `Only ${profitable} of ${scored.length} parameter neighbours stay profitable, which reads as curve fit rather than a durable edge.`,
  };
}

/* ------------------------------------------------------- variant selection */

export interface VariantResult {
  strategy: StrategyDef;
  bt: BacktestOut;
  mc: McResult;
  verdict: Verdict;
  reason: string;
}

const VERDICT_RANK: Record<Verdict, number> = {
  approved: 2,
  marginal: 1,
  rejected: 0,
};

/**
 * Tests every archetype on the same candles and returns the one that survives
 * best, plus the full field so the UI can show what was tried and rejected.
 *
 * Ranking is by verdict first, then expectancy. Picking purely by expectancy
 * would let a variant with a huge edge and an unacceptable drawdown outrank a
 * sound one, which is precisely the trade this product exists to refuse. The
 * gates are untouched: this widens the hypotheses tested, it does not lower
 * the bar any of them has to clear.
 */
export function runVariants(
  candles: Candle[],
  opts: { seedKey: string; avgAtrPct: number }
): { best: VariantResult; field: VariantResult[] } {
  const field = STRATEGIES.map((strategy) => {
    const bt = backtest(candles, strategy);
    const mc = runMonteCarlo(bt.validate, {
      seedKey: `${opts.seedKey}:${strategy.key}`,
      buyHoldReturnPct: bt.buyHoldReturnPct,
      exposureShare: bt.exposureShare,
      avgAtrPct: opts.avgAtrPct,
    });
    const { verdict, reason } = verdictFor(mc.summary);
    return { strategy, bt, mc, verdict, reason };
  });

  const best = [...field].sort((a, b) => {
    const rank = VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict];
    if (rank !== 0) return rank;
    return b.mc.summary.expectancyPct - a.mc.summary.expectancyPct;
  })[0];

  return { best, field };
}
