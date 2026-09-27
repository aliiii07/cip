"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChartAnalysis } from "@/components/terminal/ChartAnalysis";
import { Stat, VerdictPill } from "@/components/terminal/atoms";
import { ProbabilityLattice, TailRidge } from "@/components/terminal/Visuals";
import { displayValue, money, signedPct } from "@/lib/format";
import { computeIndicators } from "@/lib/indicators";
import type { McSummary, Verdict } from "@/lib/types";
import type { RobustnessResult } from "@/lib/montecarlo";
import type { Financials, Simulation, StatementLine } from "@/lib/research-types";
import { Card, GREEN, INK, Missing, Simulated, Skeleton, SubHead, Tile, Unavailable, sourceTitle } from "./atoms";
import { GroupedBars } from "./charts";
import { useCandles, useSeen, type LoadState } from "./hooks";

/* --------------------------------------------------------------- chart */

export function ChartSection({ symbol, meaning }: { symbol: string; meaning: string | null }) {
  const { bars, state } = useCandles(symbol, "1y");
  const indicators = useMemo(() => (bars.length > 60 ? computeIndicators(bars) : null), [bars]);
  return (
    <Card id="chart" title="Chart" meaning={meaning} aside={<span>Yahoo Finance · native daily candles, one year</span>}>
      {state === "loading" ? <Skeleton className="h-[400px] w-full" /> : null}
      {state === "error" ? <Unavailable text="Price data unavailable" /> : null}
      {state === "ready" && indicators ? <ChartAnalysis candles={bars} indicators={indicators} /> : null}
      {state === "ready" && !indicators ? <Missing text="Not enough history for the indicators." /> : null}
    </Card>
  );
}

/* ------------------------------------------------------- probabilities */

interface BacktestBody {
  strategy: { key: string; label: string; describe: string };
  verdict: Verdict;
  reason: string;
  summary: McSummary;
  variants: { key: string; label: string; verdict: Verdict; expectancyPct: number; trades: number; selected: boolean }[];
  robustness: RobustnessResult;
  data: { from: string; to: string; bars: number; source: string };
  computeMs: number;
}

export function ProbabilitiesSection({ symbol, simulation, meaning }: { symbol: string; simulation: Simulation | null; meaning: string | null }) {
  const [key, setKey] = useState("1y");
  const horizon = simulation?.horizons.find((h) => h.key === key) ?? simulation?.horizons[0] ?? null;
  const st = horizon?.stats;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return (
    <Card
      id="probabilities"
      title="Probabilities"
      meaning={meaning}
      aside={<Simulated />}
      source={simulation ? { form: "Yahoo Finance", filed: simulation.basedOn.to, url: `https://finance.yahoo.com/quote/${symbol}/history/`, statement: "Daily closes" } : null}
    >
      {simulation && horizon && st ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-[#E4E4E7] p-0.5" role="tablist" aria-label="Horizon">
              {simulation.horizons.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  role="tab"
                  aria-selected={h.key === horizon.key}
                  onClick={() => setKey(h.key)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors duration-200 ${h.key === horizon.key ? "bg-[#1a1a1a] text-white" : "text-[#4a4a4a] hover:text-[#1a1a1a]"}`}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[#71717A]">Based on past price moves. Not a forecast.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile label="Chance of ending higher" value={pct(st.pEndHigher)} tone={st.pEndHigher >= 0.5 ? "good" : "bad"} sub={`${st.paths.toLocaleString("en-US")} paths, ${st.days} trading days`} />
            <Tile label="Median outcome" value={signedPct(st.medianPct)} tone={st.medianPct >= 0 ? "good" : "bad"} />
            <Tile label="5th to 95th percentile" value={`${signedPct(st.p5Pct)} to ${signedPct(st.p95Pct)}`} sub="Nine in ten paths end inside this band" />
            <Tile label="Chance of a 20% or larger drop" value={pct(st.pDrop20)} tone={st.pDrop20 >= 0.5 ? "bad" : undefined} sub="At any point along the path" />
            <Tile label="Typical worst drawdown" value={`−${st.typicalWorstDrawdownPct.toFixed(1)}%`} sub="Median of each path's largest fall" />
            <Tile label="History used" value={`${simulation.basedOn.days} days`} sub={`${simulation.basedOn.from} to ${simulation.basedOn.to}`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <SubHead>Probability lattice</SubHead>
                <Simulated />
              </div>
              <ProbabilityLattice mc={horizon.mc} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <SubHead>Tail probability ridge</SubHead>
                <Simulated />
              </div>
              <TailRidge mc={horizon.mc} />
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#71717A]">
            Each path draws {st.days} daily returns, with replacement, from {simulation.basedOn.days} real trading days of this stock. Each ridge is the distribution part way along the horizon. The spread is the point.
          </p>
        </>
      ) : (
        <Missing text="Not built yet" />
      )}
      <BacktestBlock symbol={symbol} />
    </Card>
  );
}

function BacktestBlock({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<BacktestBody | null>(null);

  useEffect(() => {
    if (!seen) return;
    let cancelled = false;
    fetch(`/api/backtest?symbol=${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as BacktestBody;
      })
      .then((b) => {
        if (cancelled) return;
        setData(b);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [seen, symbol]);

  const s = data?.summary;
  return (
    <div ref={ref} className="mt-7 border-t border-[#E4E4E7] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold">Backtest: the best tested strategy versus buy and hold</h3>
        <Simulated />
      </div>
      {state === "loading" ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : null}
      {state === "error" ? <div className="mt-3"><Unavailable text="Backtest unavailable" /></div> : null}
      {state === "ready" && data && s ? (
        <>
          <p className="mt-2 text-[14px] leading-snug text-[#4a4a4a]">{data.strategy.describe}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.variants.map((v) => (
              <div key={v.key} className="rounded-[10px] border p-3" style={{ borderColor: v.selected ? INK : "#E4E4E7", background: v.selected ? "rgba(26,26,26,0.03)" : "transparent" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{v.label}</span>
                  <VerdictPill verdict={v.verdict} />
                </div>
                <div className="mt-1.5 font-mono text-[11px] tabular-nums text-[#71717A]">
                  {v.expectancyPct >= 0 ? "+" : "−"}
                  {Math.abs(v.expectancyPct).toFixed(3)}% per trade · {v.trades} trades
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
            <Stat label="Expectancy per trade, after costs" value={`${s.expectancyPct >= 0 ? "+" : "−"}${Math.abs(s.expectancyPct).toFixed(3)}%`} tone={s.expectancyPct > 0 ? "green" : "red"} />
            <Stat label="Out of sample trades" value={String(s.sampleTrades)} />
            <Stat label="Median path return" value={signedPct(s.medianPathReturnPct)} tone={s.medianPathReturnPct >= 0 ? "green" : "red"} />
            <Stat label="Buy and hold, same window" value={signedPct(s.buyHoldReturnPct)} />
            <Stat label="Buy and hold at matched exposure" value={signedPct(s.benchmarkAdjustedPct)} />
            <Stat label="Time in the market" value={`${(s.exposureShare * 100).toFixed(0)}%`} />
            <Stat label="Worst drawdown, 95th percentile" value={`−${s.maxDrawdownPct.toFixed(1)}%`} tone="red" />
            <Stat label="Paths finishing up" value={`${(s.profitablePathShare * 100).toFixed(0)}%`} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4a4a4a]">Verdict</span>
            <VerdictPill verdict={data.verdict} />
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4a4a4a]">Robustness</span>
            <VerdictPill verdict={data.robustness.verdict === "robust" ? "approved" : "rejected"} />
            <div className="flex flex-wrap items-center gap-1">
              {data.robustness.grid.map((p, i) => (
                <span
                  key={i}
                  title={`stop ${p.stopAtr}x ATR, ${p.maxBars} bars, ${p.expectancyPct >= 0 ? "+" : "−"}${Math.abs(p.expectancyPct).toFixed(3)}%, ${p.trades} trades`}
                  className="h-3.5 w-3.5 rounded-[3px]"
                  style={{ background: p.trades < 8 ? "rgba(26,26,26,0.10)" : p.expectancyPct > 0 ? GREEN : "#A12F35", opacity: p.trades < 8 ? 1 : p.withinDrawdown ? 1 : 0.45 }}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#71717A]">
            {data.reason} {data.robustness.reason} Fills on the next bar&apos;s open, 0.12% round trip fees plus depth based slippage, 70/30 chronological split with only the last 30% reported. Daily candles {data.data.from} to {data.data.to}, {data.data.source}. Computed in {data.computeMs} ms, never by a language model.
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- financials */

export function FinancialsSection({ fin, meaning }: { fin: Financials | null; meaning: string | null }) {
  const [full, setFull] = useState(false);
  if (!fin) {
    return (
      <Card id="financials" title="Financials" meaning={meaning}>
        <Missing text="Not reported yet. Financial statements were not available for this company." />
      </Card>
    );
  }
  const cats = fin.bars.map((b) => b.year);
  return (
    <Card id="financials" title="Financials" meaning={meaning} asOf={fin.asOf} source={fin.latestFiling}>
      <GroupedBars
        categories={cats}
        currency={fin.currency}
        series={[
          { name: "Revenue", color: INK, values: fin.bars.map((b) => b.revenue) },
          { name: "Operating income", color: "#4a4a4a", values: fin.bars.map((b) => b.operatingIncome) },
          { name: "Net income", color: "#A1A1AA", values: fin.bars.map((b) => b.netIncome) },
          { name: "Free cash flow", color: GREEN, values: fin.bars.map((b) => b.fcf) },
        ]}
      />
      <div className="mt-6 space-y-6">
        <StatementTable title="Income statement" lines={fin.income} years={fin.years} full={full} currency={fin.currency} />
        <StatementTable title="Balance sheet" lines={fin.balance} years={fin.years} full={full} currency={fin.currency} />
        <StatementTable title="Cash flow statement" lines={fin.cashflow} years={fin.years} full={full} currency={fin.currency} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setFull((f) => !f)} className="rounded-full border border-[#1a1a1a] px-4 py-1.5 text-[12px] font-semibold transition-colors duration-200 hover:bg-[#1a1a1a] hover:text-white">
          {full ? "Show key lines" : "Show full statements"}
        </button>
        <p className="text-[12px] text-[#71717A]">All figures in {fin.currency} as reported. TTM is the last fiscal year plus the current year to date minus the same span a year earlier.</p>
      </div>
    </Card>
  );
}

function StatementTable({ title, lines, years, full, currency }: { title: string; lines: StatementLine[]; years: string[]; full: boolean; currency: string }) {
  const rows = full ? lines : lines.filter((l) => l.keyLine);
  return (
    <div>
      <SubHead>{title}</SubHead>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[680px] text-[13px]">
          <thead>
            <tr>
              <th className="py-1.5 text-left font-medium text-[#71717A]" />
              {years.map((y) => (
                <th key={y} className="py-1.5 pl-3 text-right font-mono font-medium text-[#71717A]">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E4E7]">
            {rows.map((l) => (
              <tr key={l.key}>
                <td className="py-1.5 pr-3 text-[#4a4a4a]">{l.label}</td>
                {l.values.map((v, i) => (
                  <td key={i} className="whitespace-nowrap py-1.5 pl-3 text-right">
                    <span className="font-mono tabular-nums" title={l.sources[i] ? sourceTitle(l.sources[i]!) : undefined}>
                      {v == null ? <span className="text-[#A1A1AA]">·</span> : l.unit === "USD" ? money(v, currency) : displayValue(v, l.unit, currency)}
                    </span>
                    {l.yoy[i] != null ? (
                      <span className="ml-1.5 font-mono text-[10.5px] tabular-nums" style={{ color: (l.yoy[i] as number) >= 0 ? GREEN : "#A12F35" }}>
                        {signedPct(l.yoy[i], 0)}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
