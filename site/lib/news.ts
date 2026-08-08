import "server-only";

import type { AssetDef } from "./assets";
import type { Headline } from "./types";

/**
 * Real headlines only.
 *
 * Without NEWSAPI_KEY this returns an empty list and the panel says so. The
 * model is never asked to write a headline — only to tag one it was given.
 */

const QUERY: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  eurusd: "euro dollar exchange rate",
  usdjpy: "yen dollar exchange rate",
  aapl: "Apple Inc stock",
  tsla: "Tesla stock",
  xauusd: "gold price",
};

export async function getHeadlines(asset: AssetDef): Promise<Headline[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  const q = encodeURIComponent(QUERY[asset.key] ?? asset.label);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=5`;

  try {
    const res = await fetch(url, {
      headers: { "X-Api-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      articles?: {
        title: string;
        url: string;
        publishedAt: string;
        source?: { name?: string };
      }[];
    };
    return (body.articles ?? []).slice(0, 5).map((a) => ({
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source?.name ?? "",
    }));
  } catch {
    return [];
  }
}
