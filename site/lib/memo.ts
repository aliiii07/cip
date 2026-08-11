import { TF_SECONDS } from "./assets";
import type { DeskAnalysis } from "./analysis";
import type { RobustnessResult } from "./montecarlo";
import type { StrategyDef } from "./strategies";
import type { Indicators, McSummary, SignalAlignment, Timeframe, Verdict } from "./types";

/**
 * The decision memo: the case for the setup, the case against it, and the
 * levels the tested rule would actually use.
 *
 * Two things this file is careful about.
 *
 * Every level is derived from the SELECTED timeframe's own ATR and structure.
 * A 1h request gets a 1h stop, 1h targets and a horizon measured in hours;
 * nothing is carried over from the daily series. That is the whole point of
 * asking for a timeframe.
 *
 * And nothing here is a recommendation. These are the entry, stop and exit
 * levels of a rule that was just backtested, reported so the user can see
 * what was tested rather than being handed a number with no provenance. The
 * confidence figure is a blend of measured quantities, never a model's
 * opinion and never a random draw.
 */

export interface MemoFactor {
  label: string;
  detail: string;
  /** How strongly this argues its side, for ordering and weight bars. */
  weight: "strong" | "moderate" | "slight";
}

export interface DecisionMemo {
  /* --- levels, all in the selected timeframe -------------------------- */
  entry: number;
  stop: number;
  /** Risk per unit: the distance from entry to stop. */
  riskPerUnit: number;
  riskPct: number;
  target2R: number;
  target3R: number;
  /** Price at which the thesis is wrong, not merely losing. */
  invalidation: number;
  invalidationNote: string;
  /** Typical hold implied by the rule's bar cap, in the chosen timeframe. */
  horizon: string;

  /* --- the argument --------------------------------------------------- */
  bull: MemoFactor[];
  bear: MemoFactor[];
  setupSummary: string;
  chartEvidence: string[];

  /* --- the call -------------------------------------------------------- */
  riskLevel: "low" | "moderate" | "elevated" | "high";
  riskNote: string;
  confidencePct: number;
  confidenceBasis: string;
  verdict: Verdict;
}

function round(n: number): number {
  const abs = Math.abs(n);
  const dp = abs >= 1000 ? 2 : abs >= 10 ? 3 : abs >= 1 ? 4 : 6;
  return Number(n.toFixed(dp));
}

/** Bar cap expressed in the user's own timeframe, not in abstract bars. */
function horizonFor(tf: Timeframe, maxBars: number): string {
  const seconds = TF_SECONDS[tf] * maxBars;
  const hours = seconds / 3600;
  if (hours < 24) return `up to about ${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 14) return `up to about ${Math.round(days)} days`;
  return `up to about ${Math.round(days / 7)} weeks`;
}

export function buildMemo(opts: {
  timeframe: Timeframe;
  strategy: StrategyDef;
  indicators: Indicators;
  summary: McSummary;
  desk: DeskAnalysis;
  robustness: RobustnessResult;
  alignment: SignalAlignment;
  verdict: Verdict;
}): DecisionMemo {
  const { timeframe, strategy, indicators, summary, desk, robustness, alignment, verdict } = opts;

  /* ---- levels, from this timeframe's ATR ------------------------------ */
  const price = indicators.last;
  const atr = indicators.atrLast ?? price * 0.01;
  const entry = price;
  const stop = entry - strategy.stopAtr * atr;
  const riskPerUnit = entry - stop;
  const riskPct = (riskPerUnit / entry) * 100;

  // Structural invalidation, distinct from the money stop: the nearest mapped
  // support below, else the 50-bar mean, else the stop itself.
  const supportBelow = indicators.supports.find((s) => s.price < entry)?.price ?? null;
  const ma50 = indicators.ma50[indicators.ma50.length - 1];
  let invalidation = stop;
  let invalidationNote = `No structure below entry, so the ${strategy.stopAtr}× ATR stop is also the invalidation.`;
  if (supportBelow != null && supportBelow < entry) {
    invalidation = supportBelow;
    invalidationNote = `A close below the mapped support at ${round(supportBelow)} breaks the structure the setup relies on.`;
  } else if (ma50 != null && ma50 < entry) {
    invalidation = ma50;
    invalidationNote = `A close below the 50-bar average at ${round(ma50)} removes the trend context the rule requires.`;
  }

  /* ---- the case for --------------------------------------------------- */
  const bull: MemoFactor[] = [];
  if (indicators.trend === "uptrend") {
    bull.push({
      label: "Trend context",
      detail: `MA20 sits above MA50 by ${Math.abs(indicators.maSpreadPct ?? 0).toFixed(2)}%, the regime this rule is built for.`,
      weight: "strong",
    });
  }
  if (alignment.label !== "weak") {
    bull.push({
      label: "Timeframe agreement",
      detail: `${alignment.agreeing} of ${alignment.total} timeframes read the same ${indicators.trend}.`,
      weight: alignment.label === "strong" ? "strong" : "moderate",
    });
  }
  if (robustness.verdict === "robust") {
    bull.push({
      label: "Parameter robustness",
      detail: `${robustness.profitable} of ${robustness.tested} perturbations of the stop and hold cap stay profitable, so the edge is not one lucky setting.`,
      weight: "strong",
    });
  }
  if (summary.expectancyPct > 0) {
    bull.push({
      label: "Positive expectancy",
      detail: `${summary.expectancyPct.toFixed(3)}% per trade after fees and modelled slippage, across ${summary.sampleTrades} out-of-sample trades.`,
      weight: summary.sampleTrades >= 20 ? "strong" : "moderate",
    });
  }
  if (desk.volume.conviction === "high") {
    bull.push({
      label: "Participation",
      detail: `Latest bar traded ${desk.volume.latestRatio?.toFixed(2)}× its 20-bar average, with direction confirming.`,
      weight: "moderate",
    });
  }
  if (desk.momentum.state === "expanding") {
    bull.push({
      label: "Momentum",
      detail: `Rate of change is expanding, accelerating by ${desk.momentum.accelerationPct?.toFixed(2)}pp against the prior window.`,
      weight: "moderate",
    });
  }

  /* ---- the case against ----------------------------------------------- */
  const bear: MemoFactor[] = [];
  if (summary.maxDrawdownPct > 25) {
    bear.push({
      label: "Drawdown breach",
      detail: `Simulated drawdown reaches ${summary.maxDrawdownPct.toFixed(1)}%, past the 25% platform limit. This alone blocks approval.`,
      weight: "strong",
    });
  }
  if (robustness.verdict === "fragile") {
    bear.push({
      label: "Curve fit risk",
      detail: `Only ${robustness.profitable} of ${robustness.tested} parameter neighbours stay profitable, which reads as fitting rather than edge.`,
      weight: "strong",
    });
  }
  if (summary.expectancyPct <= 0) {
    bear.push({
      label: "Costs eat the edge",
      detail: `Expectancy is ${summary.expectancyPct.toFixed(3)}% per trade once fees and slippage are applied.`,
      weight: "strong",
    });
  }
  if (summary.profitablePathShare < 0.55) {
    bear.push({
      label: "Coin-flip outcome",
      detail: `Only ${(summary.profitablePathShare * 100).toFixed(0)}% of the 5,000 simulated paths finish above water.`,
      weight: "strong",
    });
  }
  if (desk.volatility.regime === "elevated") {
    bear.push({
      label: "Elevated volatility",
      detail: `ATR sits in the ${((desk.volatility.percentile ?? 0) * 100).toFixed(0)}th percentile of its own range, so stops are wider and sizing smaller.`,
      weight: "moderate",
    });
  }
  if (alignment.label === "weak") {
    bear.push({
      label: "Timeframes disagree",
      detail: `Only ${alignment.agreeing} of ${alignment.total} timeframes read the same direction, so the signal is not confirmed across horizons.`,
      weight: "moderate",
    });
  }
  if (summary.sampleTrades < 15) {
    bear.push({
      label: "Thin sample",
      detail: `${summary.sampleTrades} out-of-sample trades is a small basis for a conclusion, even where it clears the floor.`,
      weight: "slight",
    });
  }
  if (desk.volume.conviction === "low") {
    bear.push({
      label: "Weak participation",
      detail: `Latest bar traded ${desk.volume.latestRatio?.toFixed(2)}× its average, so the move lacks volume behind it.`,
      weight: "slight",
    });
  }

  /* ---- risk level ------------------------------------------------------ */
  // Ordered worst-first, so each branch already excludes the ones above it.
  let riskLevel: DecisionMemo["riskLevel"] = "moderate";
  if (summary.maxDrawdownPct > 35) riskLevel = "high";
  else if (summary.maxDrawdownPct > 25 || desk.volatility.regime === "elevated") riskLevel = "elevated";
  else if (summary.maxDrawdownPct < 12) riskLevel = "low";

  /* ---- confidence, blended from measured quantities only --------------- */
  // Four inputs the engine already computed, weighted and clamped. No model
  // opinion, no random draw: the same figures always give the same number.
  const wRobust = robustness.share;
  const wPaths = summary.profitablePathShare;
  const wAlign = alignment.total > 0 ? alignment.agreeing / alignment.total : 0;
  const wSample = Math.min(1, summary.sampleTrades / 30);
  const blended = wRobust * 0.35 + wPaths * 0.3 + wAlign * 0.2 + wSample * 0.15;
  // A rejected setup never reads as high confidence, whatever the blend says.
  const ceiling = verdict === "approved" ? 0.9 : verdict === "marginal" ? 0.65 : 0.45;
  const confidencePct = Math.round(Math.min(blended, ceiling) * 100);

  const confidenceBasis =
    `Blended from robustness ${(wRobust * 100).toFixed(0)}%, profitable paths ${(wPaths * 100).toFixed(0)}%, ` +
    `timeframe agreement ${(wAlign * 100).toFixed(0)}% and sample depth ${(wSample * 100).toFixed(0)}%, ` +
    `capped at ${(ceiling * 100).toFixed(0)}% by the ${verdict} verdict.`;

  /* ---- summary and evidence ------------------------------------------- */
  const setupSummary =
    verdict === "approved"
      ? `${strategy.label} on the ${timeframe} series, in an intact ${indicators.trend}, clearing every risk gate.`
      : verdict === "marginal"
        ? `${strategy.label} on the ${timeframe} series shows an edge, but not one that clears every gate cleanly.`
        : `${strategy.label} was the strongest of three archetypes on the ${timeframe} series and still does not survive its own costs.`;

  const chartEvidence: string[] = [];
  if (indicators.maSpreadPct != null) {
    chartEvidence.push(
      `MA20 ${indicators.maSpreadPct >= 0 ? "above" : "below"} MA50 by ${Math.abs(indicators.maSpreadPct).toFixed(2)}%`
    );
  }
  if (indicators.rsiLast != null) chartEvidence.push(`RSI(14) at ${indicators.rsiLast.toFixed(0)}`);
  if (indicators.atrPct != null) {
    chartEvidence.push(`ATR(14) ${indicators.atrPct.toFixed(2)}% of price, ${desk.volatility.regime}`);
  }
  if (desk.volume.conviction !== "unavailable") {
    chartEvidence.push(`Volume ${desk.volume.latestRatio?.toFixed(2)}× its 20-bar mean`);
  }
  if (desk.support.nearest) {
    chartEvidence.push(
      `Nearest support ${Math.abs(desk.support.nearest.distancePct).toFixed(2)}% below, tested ${desk.support.nearest.touches}×`
    );
  }
  if (desk.resistance.nearest) {
    chartEvidence.push(
      `Nearest resistance ${Math.abs(desk.resistance.nearest.distancePct).toFixed(2)}% above, tested ${desk.resistance.nearest.touches}×`
    );
  }

  return {
    entry: round(entry),
    stop: round(stop),
    riskPerUnit: round(riskPerUnit),
    riskPct: Number(riskPct.toFixed(2)),
    target2R: round(entry + 2 * riskPerUnit),
    target3R: round(entry + 3 * riskPerUnit),
    invalidation: round(invalidation),
    invalidationNote,
    horizon: horizonFor(timeframe, strategy.maxBars),
    bull,
    bear,
    setupSummary,
    chartEvidence,
    riskLevel,
    riskNote:
      summary.maxDrawdownPct > 25
        ? `Simulated drawdown of ${summary.maxDrawdownPct.toFixed(1)}% is past the platform limit.`
        : `Simulated drawdown of ${summary.maxDrawdownPct.toFixed(1)}% is inside the 25% limit, with a well-defined invalidation.`,
    confidencePct,
    confidenceBasis,
    verdict,
  };
}
