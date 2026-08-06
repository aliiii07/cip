"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Run } from "@/lib/api";
import { StubDataNotice } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";

const GATES = { max_drawdown_pct: 25.0, min_expectancy: 0.0, min_profit_factor: 1.0 };

export default function Portfolio() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .runs("?limit=10")
      .then(setRuns)
      .catch(() => setError("API unreachable — start it with: uvicorn api.main:app --port 8000"));
  }, []);

  const latest = runs?.find((r) => r.status === "approved" && r.backtest_results);
  const m = latest?.backtest_results ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight">Portfolio</h1>
        <span className="text-[12px] text-secondary">
          Paper portfolio mission control — search any symbol above to analyze it.
        </span>
      </div>

      {error ? <p className="mb-4 text-[13px] text-fail">{error}</p> : null}

      {runs && runs.length === 0 ? (
        <div className="card mb-4">
          <p className="mb-2 text-[13px]">
            No simulated activity yet — the portfolio fills in as strategies are built and
            approved.
          </p>
          <Link href="/build" className="btn-primary inline-block">
            Build your first strategy
          </Link>
        </div>
      ) : null}

      {m ? (
        <>
          <div className="mb-3">
            <StubDataNotice detail="metrics below come from the stub backtest engine; real backtests arrive with the vectorbt engine." />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <StatCard hero label="Expectancy / trade" value={m.expectancy.toFixed(4)} />
            <StatCard
              label="Simulated P&L"
              value="—"
              sub="Paper fills begin when a strategy is approved (P6)"
            />
            <StatCard label="Trades" value={String(m.distribution.length)} sub="simulated runs" />
            <StatCard
              label="Win rate"
              value={`${m.win_rate_pct.toFixed(1)}%`}
              sub={
                m.win_rate_pct >= 35 && m.win_rate_pct <= 55 && m.expectancy > 0
                  ? "healthy range with positive expectancy"
                  : `exp ${m.expectancy.toFixed(4)}`
              }
              tone={m.win_rate_pct >= 35 && m.expectancy > 0 ? "ok" : undefined}
            />
            <StatCard
              label="Max drawdown"
              value={`${m.max_drawdown_pct.toFixed(1)}%`}
              sub={`${m.max_drawdown_pct.toFixed(1)}% used of ${GATES.max_drawdown_pct}% limit`}
              tone={m.max_drawdown_pct < 20 ? "ok" : "warn"}
            />
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 text-[13px] font-medium">Risk gates — platform limits</h2>
              <p className="mb-2 text-[12px] text-secondary">
                Hardcoded product limits enforced by the Risk Cop. Displayed here, never editable.
              </p>
              <table className="w-full text-[13px]">
                <tbody className="mono">
                  <tr className="border-t border-line">
                    <td className="py-1.5 text-secondary">Max drawdown</td>
                    <td>{m.max_drawdown_pct.toFixed(1)}%</td>
                    <td className="text-secondary">limit {GATES.max_drawdown_pct}%</td>
                    <td className={m.max_drawdown_pct <= 25 ? "text-ok" : "text-fail"}>
                      {m.max_drawdown_pct <= 25 ? "pass" : "fail"}
                    </td>
                  </tr>
                  <tr className="border-t border-line">
                    <td className="py-1.5 text-secondary">Expectancy</td>
                    <td>{m.expectancy.toFixed(4)}</td>
                    <td className="text-secondary">min &gt; {GATES.min_expectancy}</td>
                    <td className={m.expectancy > 0 ? "text-ok" : "text-fail"}>
                      {m.expectancy > 0 ? "pass" : "fail"}
                    </td>
                  </tr>
                  <tr className="border-t border-line">
                    <td className="py-1.5 text-secondary">Profit factor</td>
                    <td>{m.profit_factor.toFixed(2)}</td>
                    <td className="text-secondary">min {GATES.min_profit_factor.toFixed(1)}</td>
                    <td className={m.profit_factor >= 1 ? "text-ok" : "text-fail"}>
                      {m.profit_factor >= 1 ? "pass" : "fail"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2 className="mb-2 text-[13px] font-medium">Outcome distribution</h2>
              <p className="mb-2 text-[12px] text-secondary">
                Illustrative distribution of simulated outcomes — the shape matters more than any
                single number. The full 5,000-permutation histogram arrives with the real Monte
                Carlo engine.
              </p>
              <table className="w-full text-[12px]">
                <tbody className="mono">
                  {m.distribution.map((d) => (
                    <tr key={d.run} className="border-t border-line">
                      <td className="py-1 text-secondary">run {d.run}</td>
                      <td>expectancy {d.expectancy.toFixed(4)}</td>
                      <td className={d.expectancy > 0 ? "text-ok" : "text-fail"}>
                        {d.expectancy > 0 ? "positive" : "negative"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {runs && runs.length > 0 ? (
        <div className="card overflow-x-auto">
          <h2 className="mb-2 text-[13px] font-medium">Recent pipeline runs</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-secondary">
                <th className="pb-2 pr-4 font-normal">Run</th>
                <th className="pb-2 pr-4 font-normal">Prompt</th>
                <th className="pb-2 pr-4 font-normal">Status</th>
                <th className="pb-2 pr-4 font-normal">Expectancy</th>
                <th className="pb-2 font-normal">Strategy</th>
              </tr>
            </thead>
            <tbody className="mono">
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-1.5 pr-4 text-secondary">{r.id.slice(0, 12)}</td>
                  <td className="max-w-[22rem] truncate py-1.5 pr-4 font-body">{r.prompt}</td>
                  <td className={`py-1.5 pr-4 ${r.status === "approved" ? "text-ok" : "text-fail"}`}>
                    {r.status}
                  </td>
                  <td className="py-1.5 pr-4">
                    {r.backtest_results ? r.backtest_results.expectancy.toFixed(4) : "—"}
                  </td>
                  <td className="py-1.5">
                    {r.strategy_id ? (
                      <Link href={`/strategy/${r.strategy_id}`} className="text-accent underline">
                        {r.strategy_id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

