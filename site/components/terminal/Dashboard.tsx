"use client";

import { LogoMark } from "@/components/Logo";
import type { AnalyzeResponse } from "@/lib/types";
import { ApprovalBanner, Panel, SimulatedBadge, Stat, TerminalDisclaimer } from "./atoms";
import { ChartAnalysis } from "./ChartAnalysis";
import {
  DataGrid,
  DistributionStats,
  FactualRead,
  NewsPanel,
  RecommendationBoard,
} from "./Panels";
import { MiniHistogram, MirofishGraph, ProbabilityLattice, TailRidge } from "./Visuals";

export function Dashboard({ data }: { data: AnalyzeResponse }) {
  const { computed, meta, asset, narrative } = data;
  const mc = computed.monteCarlo;
  const asOf = meta.asOf.slice(11, 16);

  return (
    <div className="t-frame p-3 sm:p-5">
      {/* ------------------------------------------------------------ head */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--hair)] pb-4">
        <LogoMark className="h-4 w-5 text-[var(--t-ink)]" />
        <span className="t-label !text-[var(--t-ink)]">CIP</span>
        <span className="t-label">MIROFISH</span>
        <span className="t-hair h-3 w-px" />
        <span className="text-[13px]">{asset.ticker}</span>
        <span className="t-label">{data.timeframe}</span>
        <span className="flex-1" />
        <span className="t-label">Snapshot</span>
        <span className="t-label">as of {asOf} UTC</span>
        {/* Deliberately not "LIVE" — this is computed on request, and an honest
            timestamp beats a badge that implies a stream we do not run. */}
        <span className="t-label">computed on request</span>
        {meta.simulated ? <SimulatedBadge label="Sample data" /> : null}
      </header>

      <div className="mt-4 space-y-4">
        <ApprovalBanner />

        {/* -------------------------------------------------- the strategy */}
        <Panel
          title="Strategy the pipeline built"
          aside={<SimulatedBadge />}
        >
          <p className="max-w-[80ch] text-[13px] leading-relaxed">
            {narrative.strategyPlainEnglish}
          </p>
          <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
            Fills are taken on the next bar’s open — never the signal bar’s
            close. Costs applied: 0.12% round-trip fees plus depth-based
            slippage scaled to ATR.
          </p>
        </Panel>

        {/* ------------------------------------------------------- chart */}
        <Panel
          title="Chart analysis"
          aside={
            <span className="t-label">
              {meta.simulated ? "sample candles" : `${meta.dataSource} · native candles`}
            </span>
          }
        >
          <ChartAnalysis candles={computed.candles} indicators={computed.indicators} />
        </Panel>

        {/* ------------------------------------- lattice + tail, side by side */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Probability lattice" aside={<SimulatedBadge />}>
            <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
              <div className="min-w-0">
                <ProbabilityLattice mc={mc} />
              </div>
              <div className="min-w-0">
                <DistributionStats mc={mc} />
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
              5,000 paths, each a run of {mc.summary.tradesPerPath} trades
              resampled from the out-of-sample set with price and slippage
              perturbed. The spread is the point — a single average would hide
              it.
            </p>
          </Panel>

          <Panel title="Tail probability ridge" aside={<SimulatedBadge />}>
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
                  Each ridge is the outcome distribution after one more trade.
                  The filled right tail is what an average quietly absorbs.
                </p>
              </div>
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------------ relationship */}
        <Panel
          title="MIROFISH · relationship graph"
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
                ["Hub — this asset", "var(--t-ink)"],
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
                A hollow node means the pair could not be measured. We draw the
                gap rather than fill it in.
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
                <div className="t-label mb-1.5">Last 24 bars — return spread</div>
                <MiniHistogram bins={computed.graph.edgeHistogram} />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--t-muted)]">
                Edge thickness is |Pearson r| over log returns.
              </p>
            </div>
          </div>
        </Panel>

        {/* --------------------------------------------------- the board */}
        <RecommendationBoard
          board={computed.board}
          strongestTimeframe={computed.strongestTimeframe}
          narrative={narrative}
        />

        {/* ------------------------------------------------ read + news */}
        <div className="grid gap-4 xl:grid-cols-2">
          <FactualRead narrative={narrative} indicators={computed.indicators} />
          <NewsPanel headlines={data.headlines} />
        </div>

        <DataGrid
          indicators={computed.indicators}
          mc={mc}
          dataSource={meta.dataSource}
          simulated={meta.simulated}
        />

        {/* ------------------------------------------------------ footer */}
        <TerminalDisclaimer simulated={meta.simulated} />

        <p className="text-[10px] leading-relaxed text-[var(--t-faint)]">
          Numbers computed in {meta.computeMs} ms by the engine, never by a
          language model.{" "}
          {meta.narrativeSource === "anthropic"
            ? `Wording written by ${meta.model} from those figures.`
            : "Wording assembled deterministically from those figures — no model key configured."}
        </p>
      </div>
    </div>
  );
}
