import type { Market, Timeframe } from "./types";

export interface AssetDef {
  key: string;
  label: string;
  ticker: string;
  market: Market;
  /** Binance spot symbol, when the asset trades there. */
  binance?: string;
  /** Polygon ticker, when Polygon is the source. */
  polygon?: string;
  /** Yahoo Finance chart symbol — a keyless fallback used when Polygon has no
   *  key configured. Real data, no signup required. */
  yahoo?: string;
  /** Set when the Yahoo symbol is a proxy, not the literal instrument (gold
   *  has no free spot forex-style symbol on Yahoo, so GC=F futures stands in).
   *  Surfaced in the UI rather than silently substituted. */
  yahooProxyNote?: string;
  /** Seed price used only by the deterministic sample-candle generator. */
  seedPrice: number;
  peers: string[];
}

/**
 * The curated MVP set — tap-only, no search box. Deliberately small: every one
 * of these is an asset we can source honestly.
 */
export const ASSETS: AssetDef[] = [
  {
    key: "btc",
    label: "Bitcoin",
    ticker: "BTC/USD",
    market: "crypto",
    binance: "BTCUSDT",
    seedPrice: 68000,
    peers: ["ETHUSDT", "SOLUSDT", "BNBUSDT"],
  },
  {
    key: "eth",
    label: "Ethereum",
    ticker: "ETH/USD",
    market: "crypto",
    binance: "ETHUSDT",
    seedPrice: 3400,
    peers: ["BTCUSDT", "SOLUSDT", "BNBUSDT"],
  },
  {
    key: "eurusd",
    label: "Euro / US Dollar",
    ticker: "EUR/USD",
    market: "forex",
    polygon: "C:EURUSD",
    yahoo: "EURUSD=X",
    seedPrice: 1.086,
    peers: ["BTCUSDT"],
  },
  {
    key: "usdjpy",
    label: "US Dollar / Japanese Yen",
    ticker: "USD/JPY",
    market: "forex",
    polygon: "C:USDJPY",
    yahoo: "USDJPY=X",
    seedPrice: 155.4,
    peers: ["BTCUSDT"],
  },
  {
    key: "aapl",
    label: "Apple",
    ticker: "AAPL",
    market: "stocks",
    polygon: "AAPL",
    yahoo: "AAPL",
    seedPrice: 232,
    peers: ["BTCUSDT"],
  },
  {
    key: "tsla",
    label: "Tesla",
    ticker: "TSLA",
    market: "stocks",
    polygon: "TSLA",
    yahoo: "TSLA",
    seedPrice: 318,
    peers: ["BTCUSDT"],
  },
  {
    key: "xauusd",
    label: "Gold",
    ticker: "XAU/USD",
    market: "cfd",
    polygon: "C:XAUUSD",
    yahoo: "GC=F",
    yahooProxyNote:
      "Yahoo has no free spot XAU/USD feed, so this reads COMEX gold futures (GC=F), which tracks spot gold closely.",
    seedPrice: 2650,
    peers: ["BTCUSDT"],
  },
];

export const MARKETS: { key: Market; label: string; note: string }[] = [
  { key: "crypto", label: "Crypto", note: "24/7 · Binance data" },
  { key: "forex", label: "Forex", note: "Major pairs" },
  { key: "stocks", label: "Stocks", note: "US equities" },
  { key: "cfd", label: "CFD", note: "Gold, paper basis" },
];

export const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "15m", label: "15m" },
  { key: "1h", label: "1h" },
  { key: "4h", label: "4h" },
  { key: "1d", label: "1 Day" },
];

export function assetsFor(market: Market): AssetDef[] {
  return ASSETS.filter((a) => a.market === market);
}

export function findAsset(key: string): AssetDef | undefined {
  return ASSETS.find((a) => a.key === key);
}

/** Bar length in seconds — also the Monte Carlo's session unit. */
export const TF_SECONDS: Record<Timeframe, number> = {
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};
