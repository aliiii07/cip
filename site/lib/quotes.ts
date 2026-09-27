import "server-only";

import type { Quote } from "./nasdaq50";
import { yahooQuotes } from "./yahoo";

/**
 * Live quotes for the heatmap and the research header, from Yahoo Finance's
 * quote endpoint: the same keyless source lib/marketData.ts already uses for
 * equity candles. It is the one call that returns price, day change and
 * market cap for fifty symbols at once. Polygon's equivalent needs a per
 * ticker reference lookup for the cap, fifty calls per refresh, so the
 * heatmap stays on Yahoo even when a Polygon key is set.
 */

export interface QuoteBatch {
  quotes: Quote[];
  /** Requested symbols the feed returned nothing usable for. Reported, never
   *  silently dropped: the page names them and no tile is invented. */
  missing: string[];
}

export async function getQuotes(symbols: string[]): Promise<QuoteBatch> {
  const rows = await yahooQuotes(symbols);

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
