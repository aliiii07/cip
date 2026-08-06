import { API_BASE } from "./constants";

export interface RunEvent {
  seq: number;
  type: string;
  run_id: string;
  ts: string;
  node?: string;
  tag?: string;
  status?: string;
}

export interface BacktestResults {
  expectancy: number;
  sharpe: number;
  sortino: number;
  max_drawdown_pct: number;
  profit_factor: number;
  win_rate_pct: number;
  distribution: { run: number; expectancy: number }[];
}

export interface RiskReport {
  breached: boolean;
  monte_carlo_iterations: number;
  correction_notes: string[];
}

export interface Run {
  id: string;
  prompt: string;
  status: string;
  strategy_id: string | null;
  events: RunEvent[];
  backtest_results: BacktestResults | null;
  risk_report: RiskReport | null;
  correction_history: string[];
  created_at: string;
  finished_at: string | null;
}

export interface StrategySummary {
  id: string;
  name: string;
  archetype: string;
  asset_class: string;
  universe: string[];
  created_at: string;
}

// The spec is schemas/strategy.json; the UI renders it and never invents fields.
export type Spec = Record<string, any>;

export interface SymbolHit {
  ticker: string;
  name: string;
  asset_class: string;
  exchange: string;
  provider: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetAnalysis {
  symbol: string;
  name: string;
  asset_class: string;
  timeframe: string;
  data_source: string;
  stub: boolean;
  candles: Candle[];
  series: {
    ema50: (number | null)[];
    ema200: (number | null)[];
    donchian_upper: (number | null)[];
    donchian_lower: (number | null)[];
    donchian_mid: (number | null)[];
    rsi: (number | null)[];
    sma20: (number | null)[];
  };
  latest: {
    close: number;
    trend: { direction: string; strength: string; ema_spread_pct?: number };
    momentum: { rsi: number | null; state: string };
    volatility: { atr: number | null; atr_pct: number | null; state: string };
    volume: { ratio: number | null; state: string };
    support: { level: number; touches: number; distance_pct: number } | null;
    resistance: { level: number; touches: number; distance_pct: number } | null;
  };
  levels: {
    supports: { level: number; touches: number }[];
    resistances: { level: number; touches: number }[];
  };
  signals: { type: string; label: string; timeframe: string; score: number; description: string }[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json();
}

export const api = {
  createStrategy: async (prompt: string): Promise<{ run_id: string }> => {
    const res = await fetch(`${API_BASE}/strategies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`${res.status} creating strategy run`);
    return res.json();
  },
  run: (id: string) => get<Run>(`/runs/${id}`),
  runs: (params = "") => get<Run[]>(`/runs${params}`),
  strategy: (id: string) =>
    get<{ id: string; spec: Spec; created_at: string }>(`/strategies/${id}`),
  strategies: () => get<StrategySummary[]>(`/strategies`),
  searchSymbols: (q: string) => get<SymbolHit[]>(`/symbols?q=${encodeURIComponent(q)}`),
  analysis: (symbol: string, timeframe: string) =>
    get<AssetAnalysis>(`/assets/${encodeURIComponent(symbol)}/analysis?timeframe=${timeframe}`),
  eventsUrl: (runId: string) => `${API_BASE}/runs/${runId}/events`,
};

