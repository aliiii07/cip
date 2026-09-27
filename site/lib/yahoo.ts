/**
 * Yahoo Finance access shared by the app's routes and the research script.
 *
 * Deliberately free of Next imports (no "server-only") so plain Node can run
 * it: the research pipeline needs the same prices and calendar dates the
 * site shows, from the same source, and one implementation keeps the two
 * from drifting apart.
 *
 * The quote and summary endpoints want a session cookie and a matching
 * "crumb", both handed out by Yahoo with no signup. The chart endpoint needs
 * neither. Unofficial and undocumented, so every failure is thrown and never
 * papered over with a number.
 */

const QUERY = "https://query2.finance.yahoo.com";
const COOKIE_URL = "https://fc.yahoo.com";
// A browser like string is rate limited on the crumb endpoint (429); this
// plain one is answered.
const UA = "Mozilla/5.0 (compatible; CIP-research/1.0)";
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

interface Session {
  cookie: string;
  crumb: string;
  at: number;
}

let session: Session | null = null;
let pending: Promise<Session> | null = null;

async function openSession(): Promise<Session> {
  const res = await fetch(COOKIE_URL, {
    headers: { "User-Agent": UA },
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  if (!cookie) throw new Error("yahoo: no session cookie");

  const crumbRes = await fetch(`${QUERY}/v1/test/getcrumb`, {
    headers: { "User-Agent": UA, Cookie: cookie },
    signal: AbortSignal.timeout(8000),
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumbRes.ok || !crumb || crumb.startsWith("<")) {
    throw new Error(`yahoo: crumb ${crumbRes.status}`);
  }
  return { cookie, crumb, at: Date.now() };
}

function getSession(fresh = false): Promise<Session> {
  if (!fresh && session && Date.now() - session.at < SESSION_TTL_MS) {
    return Promise.resolve(session);
  }
  if (!pending) {
    pending = openSession()
      .then((s) => {
        session = s;
        return s;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** A crumb authenticated GET, retried once with a fresh session on 401/403. */
export async function yahooJson<T>(
  path: string,
  params: Record<string, string>,
  retry = true
): Promise<T> {
  const s = await getSession();
  const qs = new URLSearchParams({ ...params, crumb: s.crumb });
  const res = await fetch(`${QUERY}${path}?${qs}`, {
    headers: { "User-Agent": UA, Cookie: s.cookie },
    signal: AbortSignal.timeout(15000),
  });
  if ((res.status === 401 || res.status === 403) && retry) {
    await getSession(true);
    return yahooJson<T>(path, params, false);
  }
  if (!res.ok) throw new Error(`yahoo ${path} ${res.status}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ chart */

export interface DailyBar {
  /** Unix seconds of the session. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartMeta {
  currency: string;
  exchangeName: string;
  regularMarketPrice: number;
  regularMarketTime: number;
  /** Unix seconds of the first bar Yahoo holds, whatever range was asked. */
  firstTradeDate: number | null;
}

interface YahooChartResponse {
  chart: {
    result?: {
      meta: {
        currency?: string;
        exchangeName?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        firstTradeDate?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: {
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }[];
      };
    }[];
    error?: { description?: string } | null;
  };
}

/**
 * Native bars from the keyless chart endpoint. Sessions Yahoo pads with
 * nulls (holidays) are dropped, never interpolated.
 */
export async function yahooChart(
  symbol: string,
  opts: { interval: "1d" | "1wk" | "1mo"; range: string }
): Promise<{ bars: DailyBar[]; meta: ChartMeta }> {
  const qs = new URLSearchParams({ interval: opts.interval, range: opts.range });
  const res = await fetch(`${QUERY}/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`yahoo chart ${symbol} ${res.status}`);
  const body = (await res.json()) as YahooChartResponse;
  const result = body.chart.result?.[0];
  if (!result) throw new Error(body.chart.error?.description ?? `yahoo chart ${symbol}: no result`);

  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const bars: DailyBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({ time: ts[i], open: o, high: h, low: l, close: c, volume: q.volume?.[i] ?? 0 });
  }
  const m = result.meta;
  return {
    bars,
    meta: {
      currency: m.currency ?? "USD",
      exchangeName: m.exchangeName ?? "",
      regularMarketPrice: m.regularMarketPrice ?? bars[bars.length - 1]?.close ?? 0,
      regularMarketTime: m.regularMarketTime ?? bars[bars.length - 1]?.time ?? 0,
      firstTradeDate: m.firstTradeDate ?? null,
    },
  };
}

/* ---------------------------------------------------------------- quotes */

export interface YahooQuoteRow {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  marketCap?: number;
  regularMarketTime?: number;
  marketState?: string;
  currency?: string;
  fullExchangeName?: string;
  sharesOutstanding?: number;
}

export async function yahooQuotes(symbols: string[]): Promise<YahooQuoteRow[]> {
  const fields = [
    "shortName",
    "longName",
    "regularMarketPrice",
    "regularMarketChange",
    "regularMarketChangePercent",
    "regularMarketPreviousClose",
    "marketCap",
    "regularMarketTime",
    "marketState",
    "currency",
    "fullExchangeName",
    "sharesOutstanding",
  ].join(",");
  const body = await yahooJson<{
    quoteResponse?: { result?: YahooQuoteRow[]; error?: { description?: string } | null };
  }>("/v7/finance/quote", { symbols: symbols.join(","), fields });
  const rows = body.quoteResponse?.result;
  if (!rows) throw new Error(body.quoteResponse?.error?.description ?? "yahoo quote: no result");
  return rows;
}

/* --------------------------------------------------------------- summary */

export interface YahooSummary {
  calendarEvents?: {
    earnings?: { earningsDate?: { raw: number; fmt: string }[] };
    exDividendDate?: { raw: number; fmt: string };
    dividendDate?: { raw: number; fmt: string };
  };
  summaryProfile?: {
    country?: string;
    sector?: string;
    industry?: string;
    fullTimeEmployees?: number;
    website?: string;
  };
  price?: { exchangeName?: string; currency?: string; marketState?: string };
}

export async function yahooSummary(symbol: string): Promise<YahooSummary> {
  const body = await yahooJson<{ quoteSummary?: { result?: YahooSummary[] } }>(
    `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
    { modules: "calendarEvents,summaryProfile,price" }
  );
  const r = body.quoteSummary?.result?.[0];
  if (!r) throw new Error(`yahoo summary ${symbol}: no result`);
  return r;
}
