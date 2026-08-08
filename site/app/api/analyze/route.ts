import { NextResponse, type NextRequest } from "next/server";

import { TIMEFRAMES, findAsset } from "@/lib/assets";
import { computeIndicators } from "@/lib/indicators";
import { backtest, runMonteCarlo, strongest, verdictFor } from "@/lib/montecarlo";
import { buildGraph } from "@/lib/correlation";
import { getCandles, getPeerCloses } from "@/lib/marketData";
import { getHeadlines } from "@/lib/news";
import { writeNarrative } from "@/lib/anthropic";
import type { AnalyzeResponse, Timeframe, TimeframeRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The on-demand pipeline. Nothing runs until someone presses Analyze — no
 * background jobs, no streams, no 24/7 loop. Cost scales with clicks.
 *
 * Order matters and is the honesty guarantee:
 *   1. fetch candles (real, or badged sample)
 *   2. compute every number in TypeScript
 *   3. hand those numbers to the model and ask only for language
 *
 * Step 3 can fail without consequence — the dashboard renders from step 2.
 */

const TTL_MS = 12 * 60 * 1000;
const cache = new Map<string, { at: number; payload: AnalyzeResponse }>();

export async function POST(req: NextRequest) {
  const started = Date.now();

  let body: { market?: string; asset?: string; timeframe?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const asset = findAsset(String(body.asset ?? ""));
  const timeframe = String(body.timeframe ?? "") as Timeframe;

  if (!asset) {
    return NextResponse.json({ error: "Unknown asset." }, { status: 400 });
  }
  if (!TIMEFRAMES.some((t) => t.key === timeframe)) {
    return NextResponse.json({ error: "Unknown timeframe." }, { status: 400 });
  }

  const key = `${asset.key}:${timeframe}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.payload);
  }

  // --- 1. Data ------------------------------------------------------------
  // All four timeframes, so the recommendation board is genuinely computed
  // rather than extrapolated from the one the user picked.
  const allTfs = TIMEFRAMES.map((t) => t.key);
  const [sets, headlines] = await Promise.all([
    Promise.all(allTfs.map((tf) => getCandles(asset, tf))),
    getHeadlines(asset),
  ]);

  const byTf = new Map(allTfs.map((tf, i) => [tf, sets[i]]));
  const selected = byTf.get(timeframe)!;

  if (selected.candles.length < 120) {
    return NextResponse.json(
      { error: "Not enough history for this asset and timeframe." },
      { status: 502 }
    );
  }

  // --- 2. Numbers — deterministic, never from the model --------------------
  const indicators = computeIndicators(selected.candles);

  const board: TimeframeRow[] = allTfs.map((tf) => {
    const set = byTf.get(tf)!;
    if (set.candles.length < 120) {
      return {
        timeframe: tf,
        verdict: "rejected",
        reason: "Not enough history at this timeframe to test anything.",
        expectancyPct: 0,
        trades: 0,
        buyHoldReturnPct: 0,
        medianPathReturnPct: 0,
        simulated: set.simulated,
      };
    }
    const bt = backtest(set.candles);
    const ind = computeIndicators(set.candles);
    const mc = runMonteCarlo(bt.validate, {
      seedKey: `${asset.key}:${tf}`,
      buyHoldReturnPct: bt.buyHoldReturnPct,
      exposureShare: bt.exposureShare,
      avgAtrPct: ind.atrPct ?? 1,
    });
    const { verdict, reason } = verdictFor(mc.summary);
    return {
      timeframe: tf,
      verdict,
      reason,
      expectancyPct: mc.summary.expectancyPct,
      trades: mc.summary.sampleTrades,
      buyHoldReturnPct: mc.summary.buyHoldReturnPct,
      medianPathReturnPct: mc.summary.medianPathReturnPct,
      simulated: set.simulated,
    };
  });

  const selectedBt = backtest(selected.candles);
  const monteCarlo = runMonteCarlo(selectedBt.validate, {
    seedKey: `${asset.key}:${timeframe}`,
    buyHoldReturnPct: selectedBt.buyHoldReturnPct,
    exposureShare: selectedBt.exposureShare,
    avgAtrPct: indicators.atrPct ?? 1,
  });

  const peerCloses = await getPeerCloses(asset.peers, timeframe);
  const graph = buildGraph({
    assetLabel: asset.ticker,
    assetCloses: selected.candles.map((c) => c.close),
    peerCloses,
    wanted: asset.peers,
    profitablePathShare: monteCarlo.summary.profitablePathShare,
    trend: indicators.trend,
  });

  // --- 3. Words — the model describes the above, and nothing else ----------
  const { narrative, source, model } = await writeNarrative({
    assetLabel: asset.label,
    ticker: asset.ticker,
    timeframe,
    simulated: selected.simulated,
    indicators,
    monteCarlo,
    board,
    headlines,
  });

  const taggedHeadlines = headlines.map((h, i) => ({
    ...h,
    sentiment: narrative.newsSentiment.find((s) => s.index === i)?.sentiment,
  }));

  const payload: AnalyzeResponse = {
    asset: {
      key: asset.key,
      label: asset.label,
      ticker: asset.ticker,
      market: asset.market,
    },
    timeframe,
    computed: {
      // Trim the chart series — the client only draws the recent window.
      candles: selected.candles.slice(-260),
      indicators: {
        ...indicators,
        ma20: indicators.ma20.slice(-260),
        ma50: indicators.ma50.slice(-260),
        rsi: indicators.rsi.slice(-260),
      },
      monteCarlo,
      board,
      graph,
      strongestTimeframe: strongest(board),
    },
    narrative,
    headlines: taggedHeadlines,
    meta: {
      asOf: new Date().toISOString(),
      simulated: selected.simulated,
      dataSource: selected.source,
      narrativeSource: source,
      computeMs: Date.now() - started,
      model,
    },
  };

  cache.set(key, { at: Date.now(), payload });
  return NextResponse.json(payload);
}
