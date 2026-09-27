import { NextResponse, type NextRequest } from "next/server";

import { computeIndicators } from "@/lib/indicators";
import { runVariants, testRobustness } from "@/lib/montecarlo";
import { COMPANY } from "@/lib/nasdaq50";
import { yahooChart } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The existing backtest, unchanged, on a company's daily candles: every
 * archetype is tested under the same costs, the winner is cluster tested for
 * robustness, and only out of sample trades are reported. This is a thinner
 * wrapper than /api/analyze (one timeframe, no narrative) around the very
 * same engine functions and gates.
 */
const TTL_MS = 12 * 60_000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  if (!COMPANY[symbol]) return NextResponse.json({ error: "Company not covered." }, { status: 404 });

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

  try {
    const started = Date.now();
    const { bars } = await yahooChart(symbol, { interval: "1d", range: "10y" });
    if (bars.length < 120) {
      return NextResponse.json({ error: "Not enough history to test anything." }, { status: 502 });
    }
    const indicators = computeIndicators(bars);
    const opts = { seedKey: `${symbol}:1d`, avgAtrPct: indicators.atrPct ?? 1 };
    const { best, field } = runVariants(bars, opts);
    const robustness = testRobustness(bars, best.strategy, opts);
    const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
    const body = {
      strategy: { key: best.strategy.key, label: best.strategy.label, describe: best.strategy.describe },
      verdict: best.verdict,
      reason: best.reason,
      summary: best.mc.summary,
      variants: field.map((v) => ({
        key: v.strategy.key,
        label: v.strategy.label,
        verdict: v.verdict,
        expectancyPct: v.mc.summary.expectancyPct,
        trades: v.mc.summary.sampleTrades,
        selected: v === best,
      })),
      robustness,
      data: { from: iso(bars[0].time), to: iso(bars[bars.length - 1].time), bars: bars.length, source: "Yahoo Finance" },
      computeMs: Date.now() - started,
    };
    cache.set(symbol, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[cip] backtest failed:", err);
    return NextResponse.json({ error: "backtest unavailable" }, { status: 502 });
  }
}
