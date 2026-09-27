import type { Bin, McResult, Ridge } from "./types";

/**
 * A Monte Carlo bootstrap of a stock's own daily returns.
 *
 * Each path is `days` daily returns drawn with replacement from the real
 * history, compounded. Nothing is fitted and no distribution is assumed: the
 * paths can only contain moves that actually happened. The output takes the
 * same shape the terminal's lattice and ridge visuals already read, so those
 * components are reused unchanged.
 *
 * Deterministic: the generator is seeded from the ticker and the data, so
 * the same history always yields the same figures. Free of Next imports so
 * the research script can run it in plain Node.
 */

const DEFAULT_PATHS = 5000;
/** Checkpoints along the horizon that feed the ridge stack. */
const SESSIONS = 8;

export interface HorizonStats {
  days: number;
  paths: number;
  /** Share of paths that end above the starting price. */
  pEndHigher: number;
  medianPct: number;
  p5Pct: number;
  p95Pct: number;
  /** Share of paths that fall 20% or more from a peak at any point. */
  pDrop20: number;
  /** Median of each path's worst peak to trough fall, in percent. */
  typicalWorstDrawdownPct: number;
}

export interface HorizonSim {
  key: string;
  label: string;
  stats: HorizonStats;
  mc: McResult;
}

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

const r2 = (n: number) => Number(n.toFixed(2));
const r4 = (n: number) => Number(n.toFixed(4));

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[i];
}

function densityCurve(values: number[], domain: [number, number], points: number): number[] {
  const [lo, hi] = domain;
  const step = (hi - lo) / points || 1;
  const counts = new Array<number>(points).fill(0);
  for (const v of values) {
    const i = Math.min(points - 1, Math.max(0, Math.floor((v - lo) / step)));
    counts[i]++;
  }
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

/** Daily log returns from a close series. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

export function bootstrapHorizon(
  returns: number[],
  opts: { key: string; label: string; days: number; seedKey: string; paths?: number }
): HorizonSim {
  const paths = opts.paths ?? DEFAULT_PATHS;
  const rand = mulberry32(seedFrom(opts.seedKey, opts.days, returns.length));
  const days = opts.days;

  const endpoints: number[] = [];
  const drawdowns: number[] = [];
  const bySession: number[][] = Array.from({ length: SESSIONS }, () => []);
  const checkpoints = Array.from({ length: SESSIONS }, (_, k) =>
    Math.max(1, Math.round(((k + 1) * days) / SESSIONS))
  );

  if (returns.length < 20) {
    return {
      key: opts.key,
      label: opts.label,
      stats: {
        days,
        paths: 0,
        pEndHigher: 0,
        medianPct: 0,
        p5Pct: 0,
        p95Pct: 0,
        pDrop20: 0,
        typicalWorstDrawdownPct: 0,
      },
      mc: emptyResult(),
    };
  }

  for (let p = 0; p < paths; p++) {
    let logEquity = 0;
    let peak = 0;
    let maxDd = 0;
    let next = 0;
    for (let d = 1; d <= days; d++) {
      logEquity += returns[Math.floor(rand() * returns.length)];
      if (logEquity > peak) peak = logEquity;
      const dd = 1 - Math.exp(logEquity - peak);
      if (dd > maxDd) maxDd = dd;
      if (next < SESSIONS && d === checkpoints[next]) {
        bySession[next].push((Math.exp(logEquity) - 1) * 100);
        next++;
      }
    }
    endpoints.push((Math.exp(logEquity) - 1) * 100);
    drawdowns.push(maxDd * 100);
  }

  endpoints.sort((a, b) => a - b);
  const sortedDd = [...drawdowns].sort((a, b) => a - b);

  const lo = quantile(endpoints, 0.005);
  const hi = quantile(endpoints, 0.995);
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
    .map((sessionValues, i) => ({
      session: checkpoints[i],
      density: densityCurve(sessionValues, domain, 48),
      tailMass: sessionValues.filter((v) => Math.abs(v) >= 15).length / sessionValues.length,
    }));

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const stdev = (xs: number[]) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };
  const pLoss15 = endpoints.filter((e) => e <= -15).length / endpoints.length;
  const pGain15 = endpoints.filter((e) => e >= 15).length / endpoints.length;

  const stats: HorizonStats = {
    days,
    paths,
    pEndHigher: r4(endpoints.filter((e) => e > 0).length / endpoints.length),
    medianPct: r2(quantile(endpoints, 0.5)),
    p5Pct: r2(quantile(endpoints, 0.05)),
    p95Pct: r2(quantile(endpoints, 0.95)),
    pDrop20: r4(drawdowns.filter((d) => d >= 20).length / drawdowns.length),
    typicalWorstDrawdownPct: r2(quantile(sortedDd, 0.5)),
  };

  const mc: McResult = {
    summary: {
      paths,
      tradesPerPath: days,
      expectancyPct: r4(mean(endpoints)),
      medianPathReturnPct: stats.medianPct,
      bestPathReturnPct: r2(endpoints[endpoints.length - 1]),
      worstPathReturnPct: r2(endpoints[0]),
      profitablePathShare: stats.pEndHigher,
      maxDrawdownPct: r2(quantile(sortedDd, 0.95)),
      sharpe: 0,
      winRatePct: 0,
      buyHoldReturnPct: 0,
      exposureShare: 1,
      benchmarkAdjustedPct: 0,
      sampleTrades: returns.length,
    },
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

  return { key: opts.key, label: opts.label, stats, mc };
}

function emptyResult(): McResult {
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
      buyHoldReturnPct: 0,
      exposureShare: 0,
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

/** Annualised volatility of daily log returns, in percent. */
export function annualisedVolPct(returns: number[]): number {
  if (returns.length < 2) return 0;
  const m = returns.reduce((a, b) => a + b, 0) / returns.length;
  const v = returns.reduce((a, b) => a + (b - m) ** 2, 0) / (returns.length - 1);
  return r2(Math.sqrt(v) * Math.sqrt(252) * 100);
}

/** Worst peak to trough fall of a close series, in percent. */
export function maxDrawdownPct(closes: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > worst) worst = dd;
  }
  return r2(worst * 100);
}

/** Slope of the stock's daily returns on the benchmark's, aligned by day. */
export function beta(stock: Map<number, number>, bench: Map<number, number>): number | null {
  const xs: number[] = [];
  const ys: number[] = [];
  stock.forEach((r, day) => {
    const b = bench.get(day);
    if (b != null) {
      xs.push(b);
      ys.push(r);
    }
  });
  if (xs.length < 60) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let cov = 0;
  let varx = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    varx += (xs[i] - mx) ** 2;
  }
  return varx > 0 ? r2(cov / varx) : null;
}
