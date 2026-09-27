import { NextResponse, type NextRequest } from "next/server";

import { COMPANY } from "@/lib/nasdaq50";
import { yahooChart } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Native price bars for the research page's charts. Same keyless source as
 * everything else, one call shared by everyone for a minute per symbol and
 * range. Weekly bars for the full history keep the payload small; the
 * shorter ranges are daily.
 */
const RANGES: Record<string, { interval: "1d" | "1wk"; range: string }> = {
  "1m": { interval: "1d", range: "1mo" },
  "6m": { interval: "1d", range: "6mo" },
  "1y": { interval: "1d", range: "1y" },
  "5y": { interval: "1d", range: "5y" },
  max: { interval: "1wk", range: "max" },
};

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  if (!COMPANY[symbol]) return NextResponse.json({ error: "Company not covered." }, { status: 404 });
  const spec = RANGES[range];
  if (!spec) return NextResponse.json({ error: "Unknown range." }, { status: 400 });

  const key = `${symbol}:${range}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const { bars, meta } = await yahooChart(symbol, spec);
    const body = { bars, meta, source: "Yahoo Finance" };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cip] candles failed:", err);
    return NextResponse.json({ error: "price data unavailable" }, { status: 502 });
  }
}
