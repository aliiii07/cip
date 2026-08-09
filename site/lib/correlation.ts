import type { GraphEdge, GraphNode, RelationshipGraph } from "./types";

/**
 * The MIROFISH relationship graph: how the analysed asset co-moves with a
 * handful of reference instruments.
 *
 * Correlations are real Pearson r over log returns wherever we could actually
 * fetch the peer series. Where we could not, the node is marked
 * `estimated: true` and the UI badges it. We do not fabricate a correlation
 * and present it as measured.
 */

const LABELS: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  SOLUSDT: "SOL",
  BNBUSDT: "BNB",
  GOLD: "Gold",
  NASDAQ: "Nasdaq",
  USD: "US Dollar",
};

/** Fixed layout, so the graph is stable between runs of the same asset. */
const POSITIONS: [number, number][] = [
  [0.5, 0.5],
  [0.19, 0.28],
  [0.81, 0.3],
  [0.28, 0.78],
  [0.72, 0.74],
  [0.5, 0.14],
  [0.5, 0.9],
];

export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 30) return null;
  const ra = logReturns(a.slice(-n));
  const rb = logReturns(b.slice(-n));
  const m = Math.min(ra.length, rb.length);
  if (m < 20) return null;

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < m; i++) {
    const x = ra[i] - ma;
    const y = rb[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

function logReturns(xs: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i - 1] > 0 && xs[i] > 0) out.push(Math.log(xs[i] / xs[i - 1]));
  }
  return out;
}

export function buildGraph(opts: {
  assetLabel: string;
  assetCloses: number[];
  peerCloses: Record<string, number[]>;
  /** Reference instruments we want on the graph even without a live series. */
  wanted: string[];
  /** Share of Monte Carlo paths finishing positive — drives P(up)/P(down). */
  profitablePathShare: number;
  trend: "uptrend" | "downtrend" | "ranging";
}): RelationshipGraph {
  const nodes: GraphNode[] = [
    {
      id: "SELF",
      label: opts.assetLabel,
      klass: "hub",
      r: 1,
      estimated: false,
      x: POSITIONS[0][0],
      y: POSITIONS[0][1],
    },
  ];

  opts.wanted.slice(0, 6).forEach((sym, i) => {
    const series = opts.peerCloses[sym];
    const r = series ? pearson(opts.assetCloses, series) : null;
    const [x, y] = POSITIONS[i + 1] ?? [0.5, 0.5];
    nodes.push({
      id: sym,
      label: LABELS[sym] ?? sym.replace("USDT", ""),
      klass: classify(r, opts.trend),
      r: r != null ? Number(r.toFixed(3)) : null,
      estimated: r == null,
      x,
      y,
    });
  });

  const edges: GraphEdge[] = nodes
    .filter((n) => n.id !== "SELF")
    .map((n) => ({
      from: "SELF",
      to: n.id,
      // Unmeasured peers draw at a deliberately faint fixed weight.
      weight: n.r != null ? Math.min(1, Math.abs(n.r)) : 0.14,
    }));

  // The dashed median path traces the most strongly-coupled instruments.
  const medianPath = [
    "SELF",
    ...nodes
      .filter((n) => n.id !== "SELF" && n.r != null)
      .sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!))
      .slice(0, 3)
      .map((n) => n.id),
  ];

  const pUp = clamp(opts.profitablePathShare, 0.02, 0.98);

  // Confidence rises with how much of the graph is actually measured.
  const measured = nodes.filter((n) => !n.estimated).length;
  const confidence = clamp(measured / nodes.length, 0.15, 1);

  return {
    nodes,
    edges,
    medianPath,
    pUp: Number(pUp.toFixed(3)),
    pDown: Number((1 - pUp).toFixed(3)),
    confidence: Number(confidence.toFixed(2)),
    edgeHistogram: histogram(opts.assetCloses),
    anyEstimated: nodes.some((n) => n.estimated),
  };
}

function classify(
  r: number | null,
  trend: "uptrend" | "downtrend" | "ranging"
): GraphNode["klass"] {
  if (r == null) return "catalyst";
  if (Math.abs(r) < 0.2) return "catalyst";
  if (r > 0) return trend === "downtrend" ? "bear" : "bull";
  return trend === "downtrend" ? "bull" : "bear";
}

/** Distribution of the last 24 bars' returns — the small edge histogram. */
function histogram(closes: number[]): number[] {
  const recent = closes.slice(-25);
  const rets = logReturns(recent).map((r) => r * 100);
  if (rets.length === 0) return new Array(12).fill(0);
  const lo = Math.min(...rets);
  const hi = Math.max(...rets);
  const span = hi - lo || 1;
  const bins = new Array(12).fill(0);
  for (const v of rets) {
    const i = Math.min(11, Math.max(0, Math.floor(((v - lo) / span) * 12)));
    bins[i]++;
  }
  const max = Math.max(...bins, 1);
  return bins.map((b) => Number((b / max).toFixed(3)));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
