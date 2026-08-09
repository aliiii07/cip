import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type {
  Headline,
  Indicators,
  McResult,
  Narrative,
  TimeframeRow,
} from "./types";

/**
 * The Anthropic call — the one place the product uses a language model.
 *
 * The division of labour is absolute and is the reason CIP can claim honesty:
 *
 *   code computes every NUMBER      (indicators, Monte Carlo, verdicts)
 *   the model writes only the WORDS (descriptions of numbers it was handed)
 *
 * Ask a model for "the expectancy and drawdown" and it will produce plausible,
 * fabricated figures — which is precisely the +200%-becomes-−30% lie this
 * product exists to kill. So the schema below contains no numeric field at
 * all: there is nothing for the model to invent.
 *
 * Output is constrained with structured outputs, so the response is valid JSON
 * against the schema by construction — no fence-stripping, no parse retries.
 */

const DEFAULT_MODEL = "claude-sonnet-5";

const SYSTEM = [
  "You are CIP's research writer.",
  "You describe ONLY the figures you are given. You never compute, estimate, adjust or invent a number — if a figure is not in the input, do not state one.",
  "Never predict a price or a market direction. Never say buy, sell, long, short, or hold.",
  "You describe a tested STRATEGY and the verdict the risk engine already reached. The verdict is given to you; never contradict, soften or upgrade it.",
  "A rejected or marginal verdict is a good outcome worth stating plainly. Do not apologise for it or hedge it.",
  "Banned words: guaranteed, risk-free, passive income, wealth generation, get rich, you will earn.",
  "The factual read is descriptive, not predictive: say what the data shows, not what it implies will happen.",
  "Plain, calm, concrete. Short sentences. Write for an intelligent beginner. This is not investment advice.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["strategyPlainEnglish", "factualRead", "timeframeNotes", "newsSentiment"],
  properties: {
    strategyPlainEnglish: {
      type: "string",
      description:
        "One sentence describing the tested strategy's entry, exit and stop in plain English.",
    },
    factualRead: {
      type: "object",
      additionalProperties: false,
      required: ["trend", "momentum", "volatility", "volume"],
      properties: {
        trend: { type: "string" },
        momentum: { type: "string" },
        volatility: { type: "string" },
        volume: { type: "string" },
      },
      description:
        "Four one-sentence factual descriptions of the supplied readings. Descriptive only.",
    },
    timeframeNotes: {
      type: "array",
      description:
        "One short note per supplied timeframe explaining its given verdict in plain English.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timeframe", "note"],
        properties: {
          timeframe: { type: "string", enum: ["15m", "1h", "4h", "1d"] },
          note: { type: "string" },
        },
      },
    },
    newsSentiment: {
      type: "array",
      description:
        "One tag per supplied headline, by its index. Empty array when no headlines were supplied.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "sentiment"],
        properties: {
          index: { type: "integer" },
          sentiment: { type: "string", enum: ["positive", "neutral", "caution"] },
        },
      },
    },
  },
} as const;

export interface NarrativeInput {
  assetLabel: string;
  ticker: string;
  timeframe: string;
  simulated: boolean;
  indicators: Indicators;
  monteCarlo: McResult;
  board: TimeframeRow[];
  headlines: Headline[];
}

export async function writeNarrative(
  input: NarrativeInput
): Promise<{ narrative: Narrative; source: "anthropic" | "fallback"; model: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { narrative: fallbackNarrative(input), source: "fallback", model: null };
  }

  const model = process.env.CIP_ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  // Only the figures the engine computed. Nothing here is the model's to change.
  const payload = {
    asset: `${input.assetLabel} (${input.ticker})`,
    timeframe: input.timeframe,
    dataIsSampleNotLive: input.simulated,
    readings: {
      lastPrice: input.indicators.last,
      barChangePct: input.indicators.changePct,
      trend: input.indicators.trend,
      ma20VsMa50SpreadPct: input.indicators.maSpreadPct,
      rsi14: input.indicators.rsiLast != null ? Number(input.indicators.rsiLast.toFixed(1)) : null,
      atrPctOfPrice: input.indicators.atrPct,
      volumeVs20BarAverage: input.indicators.volumeRatio,
      nearestSupport: input.indicators.supports[0]?.price ?? null,
      nearestResistance: input.indicators.resistances[0]?.price ?? null,
    },
    riskEngineResults: {
      montecarloPaths: input.monteCarlo.summary.paths,
      expectancyPctPerTrade: input.monteCarlo.summary.expectancyPct,
      outOfSampleTrades: input.monteCarlo.summary.sampleTrades,
      shareOfPathsProfitable: input.monteCarlo.summary.profitablePathShare,
      medianPathReturnPct: input.monteCarlo.summary.medianPathReturnPct,
      maxDrawdownPct: input.monteCarlo.summary.maxDrawdownPct,
      buyAndHoldReturnPct: input.monteCarlo.summary.buyHoldReturnPct,
      timeInMarketShare: input.monteCarlo.summary.exposureShare,
      benchmarkAtMatchedExposurePct: input.monteCarlo.summary.benchmarkAdjustedPct,
      winRatePct: input.monteCarlo.summary.winRatePct,
    },
    testedStrategy:
      "Long on a 5-bar Donchian breakout while MA20 is above MA50; exit on a close back below MA20, a 2x ATR stop, or a 14-bar cap. Fills on the next bar's open, 0.12% round-trip fees and depth-based slippage applied.",
    timeframeVerdicts: input.board.map((r) => ({
      timeframe: r.timeframe,
      verdict: r.verdict,
      engineReason: r.reason,
      expectancyPctPerTrade: r.expectancyPct,
      outOfSampleTrades: r.trades,
    })),
    headlines: input.headlines.map((h, i) => ({ index: i, title: h.title })),
  };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1400,
      system: SYSTEM,
      // A narrative pass needs no deliberation; keep the click-to-dashboard fast.
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const text = (response.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => (b.type === "text" ? b.text : ""))
      .join("");

    const parsed = JSON.parse(text) as Narrative;
    return { narrative: sanitise(parsed, input), source: "anthropic", model };
  } catch (err) {
    // The dashboard must never be blocked on the narrative — every figure it
    // shows was already computed before this call was made.
    console.error("[cip] narrative generation failed:", err);
    return { narrative: fallbackNarrative(input), source: "fallback", model: null };
  }
}

/**
 * Defence in depth. Even under a constrained schema, we clamp what the model
 * returns: strip banned language, and drop any sentiment tag pointing at a
 * headline that does not exist.
 */
const BANNED =
  /\b(guaranteed|risk-?free|passive income|wealth generation|get rich|you will earn)\b/gi;

function sanitise(n: Narrative, input: NarrativeInput): Narrative {
  const clean = (s: string) => (s ?? "").replace(BANNED, "—").trim();
  return {
    strategyPlainEnglish: clean(n.strategyPlainEnglish),
    factualRead: {
      trend: clean(n.factualRead?.trend),
      momentum: clean(n.factualRead?.momentum),
      volatility: clean(n.factualRead?.volatility),
      volume: clean(n.factualRead?.volume),
    },
    timeframeNotes: (n.timeframeNotes ?? []).map((t) => ({
      timeframe: t.timeframe,
      note: clean(t.note),
    })),
    newsSentiment: (n.newsSentiment ?? []).filter(
      (s) => s.index >= 0 && s.index < input.headlines.length
    ),
  };
}

/* ------------------------------------------------------------- fallback */

/**
 * Used when no API key is configured or the call fails. Deterministic prose
 * assembled from the same computed figures — never a placeholder or a guess.
 */
export function fallbackNarrative(input: NarrativeInput): Narrative {
  const i = input.indicators;
  // Describe the same rounded value we print, so the reading and the words
  // can't disagree at a boundary (69.7 shown as "70" but called "mid-range").
  const rsi = i.rsiLast != null ? Math.round(i.rsiLast) : null;
  const TREND_PHRASE = {
    uptrend: "an uptrend",
    downtrend: "a downtrend",
    ranging: "a range",
  } as const;

  return {
    strategyPlainEnglish:
      "Enter long when price breaks above the 5-bar high while the 20-bar average sits above the 50-bar average; exit on a close back under the 20-bar average, a stop two ATR below entry, or after 14 bars.",
    factualRead: {
      trend:
        i.maSpreadPct == null
          ? "Not enough history to place the moving averages."
          : `MA20 is ${i.maSpreadPct >= 0 ? "above" : "below"} MA50 by ${Math.abs(i.maSpreadPct).toFixed(2)}%, which reads as ${TREND_PHRASE[i.trend]}.`,
      momentum:
        rsi == null
          ? "Not enough history for RSI(14)."
          : `RSI(14) is at ${rsi}, ${rsi <= 30 ? "the oversold end" : rsi >= 70 ? "the overbought end" : "mid-range"}.`,
      volatility:
        i.atrPct == null
          ? "Not enough history for ATR(14)."
          : `ATR(14) is ${i.atrPct.toFixed(2)}% of price, the average bar range over the last 14 bars.`,
      volume:
        i.volumeRatio == null
          ? "Volume history unavailable for this series."
          : `The latest bar traded ${i.volumeRatio.toFixed(2)}× the average volume of the prior 20 bars.`,
    },
    timeframeNotes: input.board.map((r) => ({ timeframe: r.timeframe, note: r.reason })),
    newsSentiment: [],
  };
}
