"use client";

import type {
  Headline,
  Indicators,
  McResult,
  Narrative,
  SignalAlignment,
  TimeframeRow,
  Timeframe,
} from "@/lib/types";
import { Panel, SimulatedBadge, Stat, VerdictPill, fmt, pct } from "./atoms";

/* ------------------------------------------------- Recommendation board */

export function RecommendationBoard({
  board,
  strongestTimeframe,
  narrative,
}: {
  board: TimeframeRow[];
  strongestTimeframe: Timeframe | null;
  narrative: Narrative;
}) {
  const noteFor = (tf: Timeframe) =>
    narrative.timeframeNotes.find((n) => n.timeframe === tf)?.note;

  return (
    <Panel title="Recommendation board" aside={<SimulatedBadge />}>
      <div
        className="mb-4 rounded-[10px] border px-3 py-2.5 text-[11.5px] leading-relaxed"
        style={{ borderColor: "var(--hair)", background: "#f1f0e9" }}
      >
        {strongestTimeframe ? (
          <>
            Strongest support at{" "}
            <strong className="font-bold">{strongestTimeframe}</strong>. This is a
            tested strategy and its verdict, not a trade and not a view on
            direction.
          </>
        ) : (
          <>
            No timeframe cleared the risk gates for this asset. That is a
            result, not a failure. The honest answer is that this setup does
            not survive its own costs right now.
          </>
        )}
      </div>

      <div className="space-y-2">
        {board.map((row) => (
          <div
            key={row.timeframe}
            className="grid gap-3 border-b border-[var(--hair)] pb-3 last:border-0 last:pb-0 sm:grid-cols-[64px_92px_1fr_112px] sm:items-start"
          >
            <div className="t-value pt-[2px]">{row.timeframe}</div>
            <div className="pt-[1px]">
              <VerdictPill verdict={row.verdict} />
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--t-ink)]">
              {noteFor(row.timeframe) ?? row.reason}
              <span className="mt-1 block text-[10.5px] text-[var(--t-muted)]">
                {row.strategyLabel ? `${row.strategyLabel} · ` : null}
                {row.trades} out-of-sample trades · median{" "}
                {pct(row.medianPathReturnPct, 1)} · buy &amp; hold{" "}
                {pct(row.buyHoldReturnPct, 1)}
                {row.robustness ? (
                  <>
                    {" · "}
                    <span
                      style={{
                        color:
                          row.robustness === "robust" ? "var(--green-d)" : "var(--red-d)",
                      }}
                    >
                      {row.robustness}
                      {row.robustShare != null
                        ? ` (${Math.round(row.robustShare * 100)}% of cluster)`
                        : null}
                    </span>
                  </>
                ) : null}
              </span>
            </p>
            <div className="text-left sm:text-right">
              <div className="t-label">Expectancy / trade</div>
              <div
                className="t-value"
                style={{
                  color:
                    row.expectancyPct > 0 ? "var(--green-d)" : "var(--red-d)",
                }}
              >
                {row.expectancyPct >= 0 ? "+" : "−"}
                {Math.abs(row.expectancyPct).toFixed(3)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-[var(--hair)] pt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
        Ranked by expectancy after fees and slippage, never by win rate. Rows
        are rejected when the out-of-sample sample is too small, the edge is
        negative after costs, or drawdown breaches the 25% platform limit.
      </p>
    </Panel>
  );
}

/* -------------------------------------------------------- Factual read */

export function FactualRead({
  narrative,
  indicators,
  alignment,
}: {
  narrative: Narrative;
  indicators: Indicators;
  alignment: SignalAlignment;
}) {
  const cards: [string, string, string][] = [
    ["Trend", narrative.factualRead.trend, indicators.trend],
    [
      "Momentum",
      narrative.factualRead.momentum,
      indicators.rsiLast != null ? `RSI ${indicators.rsiLast.toFixed(0)}` : "—",
    ],
    [
      "Volatility",
      narrative.factualRead.volatility,
      indicators.atrPct != null ? `ATR ${indicators.atrPct.toFixed(2)}%` : "—",
    ],
    [
      "Volume",
      narrative.factualRead.volume,
      indicators.volumeRatio != null ? `${indicators.volumeRatio.toFixed(2)}×` : "—",
    ],
    [
      "Signal alignment",
      alignment.total > 0
        ? `${alignment.agreeing} of ${alignment.total} timeframes read the same ${indicators.trend}.`
        : "Not enough history across timeframes to compare.",
      alignment.label,
    ],
  ];

  return (
    <Panel title="Factual analysis">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(([label, body, chip], i) => (
          <div
            key={label}
            className={`rounded-[10px] border border-[var(--hair)] p-3 ${
              i === cards.length - 1 ? "sm:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="t-label">{label}</span>
              <span className="t-label !tracking-normal">{chip}</span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
        Descriptions of what the data shows. Not predictions, not
        recommendations. Every reading above was computed before it was
        described.
      </p>
    </Panel>
  );
}

/* -------------------------------------------------------- Distribution */

export function DistributionStats({ mc }: { mc: McResult }) {
  const s = mc.summary;
  return (
    <>
      <Stat
        label="Expectancy / trade"
        value={`${s.expectancyPct >= 0 ? "+" : "−"}${Math.abs(s.expectancyPct).toFixed(3)}%`}
        tone={s.expectancyPct > 0 ? "green" : "red"}
        hint="Mean net return per trade after fees and modelled slippage. The headline metric."
      />
      <Stat label="Paths dropped" value={s.paths.toLocaleString("en-US")} />
      <Stat
        label="Landed profitable"
        value={`${(s.profitablePathShare * 100).toFixed(1)}%`}
        tone={s.profitablePathShare >= 0.55 ? "green" : "amber"}
      />
      <Stat label="Median path" value={pct(s.medianPathReturnPct, 1)} />
      <Stat label="Best path" value={pct(s.bestPathReturnPct, 1)} tone="green" />
      <Stat label="Worst path" value={pct(s.worstPathReturnPct, 1)} tone="red" />
      <Stat
        label="Buy & hold (same window)"
        value={pct(s.buyHoldReturnPct, 1)}
        hint="Holding the asset outright across the whole out-of-sample window."
      />
      <Stat
        label="Time in market"
        value={`${(s.exposureShare * 100).toFixed(0)}%`}
        hint="Share of the window the strategy actually held a position."
      />
      <Stat
        label="Benchmark at matched exposure"
        value={pct(s.benchmarkAdjustedPct, 1)}
        hint="Buy & hold scaled to the strategy's own exposure: the like-for-like bar it has to clear."
      />
      <Stat
        label="Win rate"
        value={`${s.winRatePct.toFixed(1)}%`}
        hint="Shown beside expectancy, never alone. A low win rate with an asymmetric payoff is healthy."
      />
      <Stat label="Max drawdown (95th pct)" value={`${s.maxDrawdownPct.toFixed(1)}%`} />
      <Stat label="Out-of-sample trades" value={String(s.sampleTrades)} />
    </>
  );
}

/* --------------------------------------------------------------- News */

const TAG_STYLE: Record<string, string> = {
  positive: "v-approved",
  neutral: "v-marginal",
  caution: "v-rejected",
};

export function NewsPanel({ headlines }: { headlines: Headline[] }) {
  return (
    <Panel title="News & sentiment">
      {headlines.length === 0 ? (
        <p className="text-[11.5px] leading-relaxed text-[var(--t-muted)]">
          No news feed is configured, so this panel is empty. Headlines here are
          always real articles from a news provider. CIP tags them; it does not
          write them. An invented headline would be worse than none.
        </p>
      ) : (
        <ul className="space-y-3">
          {headlines.map((h, i) => (
            <li key={i} className="border-b border-[var(--hair)] pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] leading-relaxed underline-offset-2 hover:underline"
                >
                  {h.title}
                </a>
                {h.sentiment ? (
                  <span className={`verdict shrink-0 ${TAG_STYLE[h.sentiment]}`}>
                    {h.sentiment}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-[10px] text-[var(--t-muted)]">
                {h.source} · {new Date(h.publishedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------- Market data */

export function DataGrid({
  indicators,
  mc,
  dataSource,
  simulated,
}: {
  indicators: Indicators;
  mc: McResult;
  dataSource: string;
  simulated: boolean;
}) {
  return (
    <Panel title="Market data">
      <Stat label="Source" value={simulated ? "sample (no key)" : dataSource} />
      <Stat label="Candles" value="native, unsmoothed" />
      <Stat label="Fee model" value="0.12% round trip" />
      <Stat label="Slippage" value="depth-based, ATR-scaled" />
      <Stat label="Split" value="70 / 30 chronological" />
      <Stat
        label="Path σ (1 s.d.)"
        value={`${mc.tails.impliedVolPct.toFixed(1)}%`}
        hint="Standard deviation of the 5,000 simulated path outcomes."
      />
      <Stat label="Nearest support" value={indicators.supports[0] ? fmt(indicators.supports[0].price, 4) : "—"} />
      <Stat
        label="Nearest resistance"
        value={indicators.resistances[0] ? fmt(indicators.resistances[0].price, 4) : "—"}
      />
    </Panel>
  );
}
