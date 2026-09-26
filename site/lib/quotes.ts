import "server-only";

import type { Quote } from "./nasdaq50";

/**
 * Live quotes for the heatmap, from Yahoo Finance's quote endpoint: the same
 * keyless source lib/marketData.ts already uses for equity candles. It is the
 * one call that returns price, day change and market cap for fifty symbols
 * at once. Polygon's equivalent needs a per ticker reference lookup for the
 * cap, fifty calls per refresh, so the heatmap stays on Yahoo even when a
 * Polygon key is set.
 *
 * Unlike the chart endpoint, the quote endpoint wants a session cookie and a
 * matching "crumb" token, both handed out by Yahoo with no signup. They are
 * fetched once, reused until Yahoo rejects them, then refreshed. The endpoint
 * is unofficial and undocumented, so it can change without notice; that is
 * why every failure surfaces to the page as "unavailable", never as a number.
 */

const QUERY = "https://query2.finance.yahoo.com";
const COOKIE_URL = "https://fc.yahoo.com";
// The same plain agent lib/marketData.ts sends. A browser like string is
// rate limited on the crumb endpoint (429) while this one is answered.
const UA = "Mozilla/5.0 (compatible; CIP-research/1.0)";
const FIELDS = [
  "shortName",
  "longName",
  "regularMarketPrice",
  "regularMarketChange",
  "regularMarketChangePercent",
  "marketCap",
  "regularMarketTime",
  "marketState",
  "currency",
].join(",");
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
    cache: "no-store",
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
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumbRes.ok || !crumb || crumb.startsWith("<")) {
    throw new Error(`yahoo: crumb ${crumbRes.status}`);
  }
  return { cookie, crumb, at: Date.now() };
}

/** Concurrent callers share one in-flight session request. */
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

interface YahooQuoteRow {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  regularMarketTime?: number;
  marketState?: string;
  currency?: string;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteRow[];
    error?: { description?: string } | null;
  };
}

function requestQuotes(symbols: string[], s: Session): Promise<Response> {
  const url =
    `${QUERY}/v7/finance/quote?symbols=${symbols.join(",")}` +
    `&fields=${FIELDS}&crumb=${encodeURIComponent(s.crumb)}`;
  return fetch(url, {
    headers: { "User-Agent": UA, Cookie: s.cookie },
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
}

export interface QuoteBatch {
  quotes: Quote[];
  /** Requested symbols the feed returned nothing usable for. Reported, never
   *  silently dropped: the page names them and no tile is invented. */
  missing: string[];
}

export async function getQuotes(symbols: string[]): Promise<QuoteBatch> {
  let res = await requestQuotes(symbols, await getSession());
  if (res.status === 401 || res.status === 403) {
    res = await requestQuotes(symbols, await getSession(true));
  }
  if (!res.ok) throw new Error(`yahoo quote ${res.status}`);

  const body = (await res.json()) as YahooQuoteResponse;
  const rows = body.quoteResponse?.result;
  if (!rows) throw new Error(body.quoteResponse?.error?.description ?? "yahoo quote: no result");

  const quotes: Quote[] = [];
  for (const r of rows) {
    if (
      r.regularMarketPrice == null ||
      r.regularMarketChangePercent == null ||
      r.marketCap == null ||
      r.regularMarketTime == null
    ) {
      continue;
    }
    quotes.push({
      symbol: r.symbol,
      name: r.longName ?? r.shortName ?? r.symbol,
      price: r.regularMarketPrice,
      change: r.regularMarketChange ?? 0,
      changePct: r.regularMarketChangePercent,
      marketCap: r.marketCap,
      time: r.regularMarketTime,
      marketState: r.marketState ?? "CLOSED",
    });
  }

  if (quotes.length === 0) throw new Error("yahoo quote: nothing usable returned");
  const missing = symbols.filter((s) => !quotes.some((q) => q.symbol === s));
  return { quotes, missing };
}
