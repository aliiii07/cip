"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import type { AnalyzeResponse } from "@/lib/types";
import { ApprovalBanner, Panel, SimulatedBadge, Stat, TerminalDisclaimer, VerdictPill } from "./atoms";
import { ChartAnalysis } from "./ChartAnalysis";
import {
  DataGrid,
  DistributionStats,
  FactualRead,
  RecommendationBoard,
} from "./Panels";
import { MiniHistogram, MirofishGraph, ProbabilityLattice, TailRidge } from "./Visuals";
import { DeskPanels } from "./DeskPanels";
import { DecisionMemo } from "./DecisionMemo";

/**
 * Words describing the pipeline's own ongoing computation — never a claim
 * about a live external feed. This cycles purely to say "the engine is the
 * thing running here," which is true: the dashboard recomputes candidate
 * strategies and correlations every time this page loads.
 */
const ENGINE_WORDS = ["correlating", "resampling", "stress-testing", "scoring"];

function EngineStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ENGINE_WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="t-label inline-flex items-center gap-1.5">
      <span className="engine-dot" aria-hidden />
      <span key={i} className="ticker-word">
        {ENGINE_WORDS[i]}
      </span>
    </span>
  );
}

/** Cascades the dashboard's major blocks in, staggered — a settle, not a slam. */
function Stagger({ i, children }: { i: number; children: ReactNode }) {
  return (
    <div className="panel-open" style={{ animationDelay: `${i * 55}ms`, animationFillMode: "backwards" }}>
      {children}
    </div>
  );
}

export function Dashboard({ data }: { data: AnalyzeResponse }) {
  const { computed, meta, asset, narrative } = data;
  const mc = computed.monteCarlo;
  const dataAsOf = meta.dataAsOf.slice(11, 16);
  let block = 0;

  const memo = computed.memo;
  const RISK_TONE: Record<string, string> = {
    low: "var(--green-d)",
    moderate: "var(--t-ink)",
    elevated: "var(--amber-d)",
    high: "var(--red-d)",
  };

  return (
    <div className="t-frame p-3 sm:p-5">
      {/* ------------------------------------------------------------ head */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--hair)] pb-4">
        <LogoMark className="h-4 w-5 text-[var(--t-ink)]" />
        <span className="t-label !text-[var(--t-ink)]">CIP</span>
        <span className="t-label">MIROFISH</span>
        <span className="t-hair h-3 w-px" />
        <span className="t-num !text-[13px] font-semibold">{asset.ticker}</span>
        <span className="t-label">{data.timeframe}</span>
        <span className="flex-1" />
        <EngineStatus />
        <span className="t-hair h-3 w-px" />
        {/* Deliberately not "LIVE" — this is computed on request, and an honest
            timestamp beats a badge that implies a stream we do not run. The
            timestamp is the data's own, not the request time: a closed market
            or a lagging feed shows its real last-updated time, never "now". */}
        {meta.simulated ? (
          <SimulatedBadge label="Sample data" />
        ) : meta.stale ? (
          <span className="t-label" style={{ color: "#8a6f14" }}>
            last available · {dataAsOf} UTC
          </span>
        ) : (
          <span className="t-label">market data · {dataAsOf} UTC</span>
        )}
      </header>

      <div className="mt-3 space-y-3">
        {/* ------------------------------------------- headline verdict row
            The three figures that decide the outcome, given the size and the
            colour to match. Everything below this is the supporting case. */}
        <Stagger i={block++}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="t-panel p-3">
              <div className="t-label">Engine verdict</div>
              <div className="mt-1.5">
                <VerdictPill verdict={memo.verdict} />
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-[var(--t-muted)]">
                {memo.verdict === "approved"
                  ? "Cleared every deterministic risk gate."
                  : memo.verdict === "marginal"
                    ? "An edge exists but does not clear every gate."
                    : "Does not survive its own costs. Do not trade."}
              </p>
            </div>

            <div className="t-panel p-3">
              <div className="t-label">Risk level</div>
              <div
                className="mt-1 text-[17px] uppercase tracking-[0.12em]"
                style={{ color: RISK_TONE[memo.riskLevel] }}
              >
                {memo.riskLevel}
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-[var(--t-muted)]">
                {memo.riskNote}
              </p>
            </div>

            <div className="t-panel p-3">
              <div className="t-label">Confidence</div>
              <div className="t-num mt-1 !text-[24px] leading-none">{memo.confidencePct}%</div>
              <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[rgba(35,35,30,0.08)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${memo.confidencePct}%`, background: "var(--t-ink)" }}
                />
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-[var(--t-muted)]">
                Derived, not asserted. Capped by the verdict.
              </p>
            </div>
          </div>
        </Stagger>

        {/* -------------------------------------------------- the strategy */}
        <Stagger i={block++}>
        <Panel
          title="Strategy the pipeline built" code="STRAT"
          aside={
            <>
              <span className="t-label">{computed.strategy.label}</span>
              <SimulatedBadge />
            </>
          }
        >
          <p className="max-w-[80ch] text-[13px] leading-relaxed">
            {narrative.strategyPlainEnglish}
          </p>

          {/* Every archetype the engine tried, not only the one that won.
              Showing the rejected field is the point: it is the difference
              between "this asset has no edge" and "the one rule we tried had
              no edge here." */}
          <div className="mt-4 border-t border-[var(--hair)] pt-3">
            <div className="t-label mb-2">Archetypes tested</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {computed.variants.map((v) => (
                <div
                  key={v.key}
                  className="rounded-[6px] border p-2.5"
                  style={{
                    borderColor: v.selected ? "var(--t-ink)" : "var(--hair)",
                    background: v.selected ? "rgba(35,35,30,0.03)" : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold">{v.label}</span>
                    <VerdictPill verdict={v.verdict} />
                  </div>
                  <div className="mt-1.5 text-[10.5px] text-[var(--t-muted)]">
                    {v.expectancyPct >= 0 ? "+" : "−"}
                    {Math.abs(v.expectancyPct).toFixed(3)}% / trade · {v.trades} trades
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Robustness: the neighbours of the winning settings, not the
              settings alone. An edge that survives only at one exact stop is
              curve fit, and the point estimate alone would hide that. */}
          <div className="mt-4 border-t border-[var(--hair)] pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="t-label">Parameter robustness</span>
              <VerdictPill
                verdict={computed.robustness.verdict === "robust" ? "approved" : "rejected"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {computed.robustness.grid.map((p, i) => (
                <span
                  key={i}
                  title={`stop ${p.stopAtr}× ATR · ${p.maxBars} bars · ${p.expectancyPct >= 0 ? "+" : "−"}${Math.abs(p.expectancyPct).toFixed(3)}% · ${p.trades} trades`}
                  className="h-4 w-4 rounded-[3px]"
                  style={{
                    background:
                      p.trades < 8
                        ? "rgba(35,35,30,0.10)"
                        : p.expectancyPct > 0
                          ? "var(--green-d)"
                          : "var(--red-d)",
                    opacity: p.trades < 8 ? 1 : p.withinDrawdown ? 1 : 0.45,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
              {computed.robustness.reason} Each square is one run with the stop
              and hold cap shifted ±10% and ±20%; faded squares breach the
              drawdown limit, grey ones had too few trades to judge.
            </p>
          </div>

          <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
            Fills on the next bar’s open, never the signal close. 0.12%
            round-trip fees plus depth-based slippage applied. The winner is
            the archetype that clears the most gates, then the highest
            expectancy — never the highest return alone.
          </p>
        </Panel>
        </Stagger>

        {/* ------------------------------------------------------- chart */}
        <Stagger i={block++}>
        <Panel
          title="Chart analysis" code="CHART"
          aside={
            <span className="t-label">
              {meta.simulated ? "sample candles" : `${meta.dataSource} · native candles`}
            </span>
          }
        >
          <ChartAnalysis candles={computed.candles} indicators={computed.indicators} />
          {meta.dataSourceDetail ? (
            <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
              {meta.dataSourceDetail}
            </p>
          ) : null}
        </Panel>
        </Stagger>

        {/* ------------------------------------- lattice + tail, side by side */}
        <div className="grid gap-3 xl:grid-cols-2">
          <Stagger i={block++}>
          <Panel title="Probability lattice" code="MC" aside={<SimulatedBadge />}>
            <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
              <div className="min-w-0">
                <ProbabilityLattice mc={mc} />
              </div>
              <div className="min-w-0">
                <DistributionStats mc={mc} />
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
              5,000 paths of {mc.summary.tradesPerPath} resampled trades, price
              and slippage perturbed. The spread is the point.
            </p>
          </Panel>
          </Stagger>

          <Stagger i={block++}>
          <Panel title="Tail probability ridge" code="TAIL" aside={<SimulatedBadge />}>
            <div className="grid gap-4 lg:grid-cols-[1fr_170px]">
              <div className="min-w-0">
                <TailRidge mc={mc} />
              </div>
              <div className="min-w-0">
                <Stat label="Sessions shown" value={String(mc.ridges.length)} />
                <Stat label="Tail mass" value={`${(mc.tails.tailMass * 100).toFixed(1)}%`} />
                <Stat label="Path σ (1 s.d.)" value={`${mc.tails.impliedVolPct.toFixed(1)}%`} />
                <Stat
                  label="P(≤ −15%)"
                  value={`${(mc.tails.pLoss15 * 100).toFixed(1)}%`}
                  tone="red"
                />
                <Stat
                  label="P(≥ +15%)"
                  value={`${(mc.tails.pGain15 * 100).toFixed(1)}%`}
                  tone="green"
                />
                <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
                  Each ridge is the distribution after one more trade. The
                  filled tail is what an average hides.
                </p>
              </div>
            </div>
          </Panel>
          </Stagger>
        </div>

        {/* ------------------------------------------------ relationship */}
        <Stagger i={block++}>
        <Panel
          title="MIROFISH · relationship graph" code="CORR"
          aside={
            computed.graph.anyEstimated ? (
              <SimulatedBadge label="Partly unmeasured" />
            ) : null
          }
        >
          <div className="grid gap-4 lg:grid-cols-[170px_1fr_190px]">
            <div className="order-2 min-w-0 lg:order-1">
              <div className="t-label mb-2">Node class</div>
              {[
                ["Hub · this asset", "var(--t-ink)"],
                ["Co-moves with trend", "var(--green)"],
                ["Moves against", "var(--red)"],
                ["Weak / unmeasured", "var(--amber)"],
              ].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2 py-[5px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-[10.5px] leading-tight">{label}</span>
                </div>
              ))}
              <p className="mt-3 text-[10px] leading-relaxed text-[var(--t-muted)]">
                Hollow = not measured. We draw the gap rather than fill it in.
              </p>
            </div>

            <div className="order-1 min-w-0 lg:order-2">
              <MirofishGraph graph={computed.graph} />
            </div>

            <div className="order-3 min-w-0">
              <Stat
                label="Paths finishing up"
                value={`${(computed.graph.pUp * 100).toFixed(1)}%`}
                tone="green"
              />
              <Stat
                label="Paths finishing down"
                value={`${(computed.graph.pDown * 100).toFixed(1)}%`}
                tone="red"
              />
              <Stat
                label="Edges measured"
                value={`${(computed.graph.confidence * 100).toFixed(0)}%`}
              />
              <div className="mt-3">
                <div className="t-label mb-1.5">Last 24 bars · return spread</div>
                <MiniHistogram bins={computed.graph.edgeHistogram} />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--t-muted)]">
                Edge thickness is |Pearson r| over log returns.
              </p>
            </div>
          </div>
        </Panel>
        </Stagger>

        {/* ------------------------------------------------ decision memo */}
        <Stagger i={block++}>
          <DecisionMemo memo={computed.memo} timeframe={data.timeframe} />
        </Stagger>

        {/* ---------------------------------------------- the desk grid */}
        <Stagger i={block++}>
          <DeskPanels desk={computed.desk} />
        </Stagger>

        {/* --------------------------------------------------- the board */}
        <Stagger i={block++}>
        <RecommendationBoard
          board={computed.board}
          strongestTimeframe={computed.strongestTimeframe}
          narrative={narrative}
        />
        </Stagger>

        {/* ------------------------------------------------ factual read */}
        <Stagger i={block++}>
          <FactualRead
            narrative={narrative}
            indicators={computed.indicators}
            alignment={computed.signalAlignment}
          />
        </Stagger>

        <Stagger i={block++}>
        <DataGrid
          indicators={computed.indicators}
          mc={mc}
          dataSource={meta.dataSource}
          simulated={meta.simulated}
        />
        </Stagger>

        {/* ------------------------------------------------------ footer */}
        <Stagger i={block++}><ApprovalBanner /></Stagger>

        <TerminalDisclaimer simulated={meta.simulated} />

        <p className="text-[10px] leading-relaxed text-[var(--t-faint)]">
          Computed in {meta.computeMs} ms by the engine, never by a language
          model.{" "}
          {meta.narrativeSource === "anthropic"
            ? `Wording written by ${meta.model} from those figures.`
            : "Wording assembled deterministically. No model key configured."}
        </p>
      </div>
    </div>
  );
}
