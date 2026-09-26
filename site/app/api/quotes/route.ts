import { NextResponse } from "next/server";

import { NASDAQ_50, type Quote } from "@/lib/nasdaq50";
import { getQuotes } from "@/lib/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The heatmap's feed. One upstream call is shared by everyone for TTL_MS so a
 * room full of open tabs costs Yahoo one request per half minute, not one per
 * tab per refresh.
 *
 * When the upstream fails, the last good set is served for a bounded time
 * and flagged `stale`, so the page keeps showing real quotes with their own
 * timestamp while it retries. Past that window the route answers 502 and the
 * page shows its unavailable state. Nothing here ever fills a gap with a
 * number of its own.
 */
const TTL_MS = 30_000;
const STALE_LIMIT_MS = 10 * 60_000;

const SYMBOLS = NASDAQ_50.map((c) => c.symbol);

let cached: { at: number; quotes: Quote[]; missing: string[] } | null = null;

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return NextResponse.json({ ...cached, fetchedAt: cached.at, stale: false }, NO_STORE);
  }

  try {
    const { quotes, missing } = await getQuotes(SYMBOLS);
    if (missing.length > 0) console.warn("[cip] quotes missing for:", missing.join(", "));
    cached = { at: now, quotes, missing };
    return NextResponse.json({ quotes, missing, fetchedAt: now, stale: false }, NO_STORE);
  } catch (err) {
    console.error("[cip] quotes failed:", err);
    if (cached && now - cached.at < STALE_LIMIT_MS) {
      return NextResponse.json({ ...cached, fetchedAt: cached.at, stale: true }, NO_STORE);
    }
    return NextResponse.json({ error: "quotes unavailable" }, { status: 502, ...NO_STORE });
  }
}
