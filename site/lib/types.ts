export type Market = "crypto" | "forex" | "stocks" | "cfd";
export type Timeframe = "15m" | "1h" | "4h" | "1d";

export interface Candle {
  time: number; // unix seconds, bar open
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleSet {
  candles: Candle[];
  /** True when these are deterministic sample candles, not exchange data. */
  simulated: boolean;
  /** Short label for tight UI slots, e.g. "Yahoo Finance". */
  source: string;
  /** Set only when `source` is a disclosed proxy, not the literal instrument
   *  (e.g. gold's COMEX futures standing in for spot XAU/USD). Shown as its
   *  own line rather than silently folded into `source`. */
  sourceDetail?: string;
  /** Unix seconds of the most recent candle — the data's own timestamp. */
  asOf: number;
  /** True when real data's last bar is old relative to its timeframe: a closed
   *  market or a lagging feed, not a live-moving price. Always false for
   *  simulated data, whose last bar is synthesized at request time. */
  stale: boolean;
}

export interface Indicators {
  last: number;
  changePct: number;
  ma20: (number | null)[];
  ma50: (number | null)[];
  rsi: (number | null)[];
  rsiLast: number | null;
  atrLast: number | null;
  atrPct: number | null;
  volumeRatio: number | null;
  trend: "uptrend" | "downtrend" | "ranging";
  maSpreadPct: number | null;
  supports: Level[];
  resistances: Level[];
}

export interface Level {
  price: number;
  touches: number;
}

export interface Trade {
  /** Index of the entry bar in the source series — used for the 70/30 split. */
  entryIndex: number;
  entry: number;
  exit: number;
  bars: number;
  /** Net of maker/taker fees and modelled slippage. */
  netReturnPct: number;
  grossReturnPct: number;
}

export interface McSummary {
  paths: number;
  tradesPerPath: number;
  /** Mean net return per trade, in percent. The headline metric. */
  expectancyPct: number;
  medianPathReturnPct: number;
  bestPathReturnPct: number;
  worstPathReturnPct: number;
  profitablePathShare: number;
  maxDrawdownPct: number;
  sharpe: number;
  winRatePct: number;
  /** Raw buy-and-hold over the out-of-sample window. Always shown. */
  buyHoldReturnPct: number;
  /** Share of the out-of-sample window the strategy actually held a position. */
  exposureShare: number;
  /**
   * Buy-and-hold scaled to the strategy's exposure. The strategy is only in
   * the market part of the time, so this is the like-for-like bar it has to
   * clear; the raw figure is still reported beside it.
   */
  benchmarkAdjustedPct: number;
  sampleTrades: number;
}

export interface Bin {
  from: number;
  to: number;
  count: number;
}

export interface Ridge {
  session: number;
  /** Density curve, normalised 0..1, sampled across the same x-domain. */
  density: number[];
  tailMass: number;
}

export interface McResult {
  summary: McSummary;
  /** Final return of each sampled path, for the lattice scatter. */
  endpoints: number[];
  bins: Bin[];
  domain: [number, number];
  ridges: Ridge[];
  tails: {
    pLoss15: number;
    pGain15: number;
    tailMass: number;
    impliedVolPct: number;
  };
}

export type Verdict = "approved" | "rejected" | "marginal";

export interface TimeframeRow {
  timeframe: Timeframe;
  verdict: Verdict;
  /** Deterministic, code-derived reason. The model may rephrase, never change. */
  reason: string;
  expectancyPct: number;
  trades: number;
  buyHoldReturnPct: number;
  medianPathReturnPct: number;
  simulated: boolean;
  trend: Indicators["trend"] | null;
  /** Which archetype won at this timeframe. Null when nothing could be tested. */
  strategyLabel?: string;
  /** Whether that winner survives its own parameter neighbourhood. */
  robustness?: "robust" | "fragile";
  robustShare?: number;
}

/** One archetype's result, so the UI can show what was tried, not just what won. */
export interface VariantRow {
  key: string;
  label: string;
  verdict: Verdict;
  expectancyPct: number;
  trades: number;
  selected: boolean;
}

export interface SignalAlignment {
  /** How many of the four timeframes read the same trend direction as the one selected. */
  agreeing: number;
  total: number;
  label: "strong" | "moderate" | "weak";
}

export interface GraphNode {
  id: string;
  label: string;
  klass: "hub" | "bull" | "bear" | "catalyst";
  /** Pearson r against the analysed asset, or null when not computable. */
  r: number | null;
  estimated: boolean;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  medianPath: string[];
  pUp: number;
  pDown: number;
  confidence: number;
  edgeHistogram: number[];
  anyEstimated: boolean;
}

export interface Headline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: "positive" | "neutral" | "caution";
}

export interface Narrative {
  strategyPlainEnglish: string;
  factualRead: {
    trend: string;
    momentum: string;
    volatility: string;
    volume: string;
  };
  timeframeNotes: { timeframe: Timeframe; note: string }[];
  newsSentiment: { index: number; sentiment: "positive" | "neutral" | "caution" }[];
}

export interface AnalyzeResponse {
  asset: { key: string; label: string; ticker: string; market: Market };
  timeframe: Timeframe;
  computed: {
    candles: Candle[];
    indicators: Indicators;
    monteCarlo: McResult;
    board: TimeframeRow[];
    graph: RelationshipGraph;
    strongestTimeframe: Timeframe | null;
    signalAlignment: SignalAlignment;
    /** The winning archetype at the selected timeframe. */
    strategy: { key: string; label: string; describe: string };
    /** Every archetype tested, winner included. */
    variants: VariantRow[];
    /** Volume, zones, momentum, volatility, exposure and sizing. */
    desk: import("./analysis").DeskAnalysis;
    /** The ±10/20% parameter cluster around the winning rule. */
    robustness: import("./montecarlo").RobustnessResult;
  };
  narrative: Narrative;
  headlines: Headline[];
  meta: {
    /** When this response was computed. */
    asOf: string;
    /** When the underlying market data itself is from — can predate `asOf`
     *  when a market is closed or a feed lags. */
    dataAsOf: string;
    /** True when real data is old relative to the timeframe: closed market or
     *  lagging feed. Always false when `simulated` is true. */
    stale: boolean;
    simulated: boolean;
    dataSource: string;
    dataSourceDetail?: string;
    narrativeSource: "anthropic" | "fallback";
    computeMs: number;
    model: string | null;
  };
}
