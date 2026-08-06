"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Run } from "@/lib/api";
import { Badge, StubData } from "@/components/Badge";
import { UtcClock } from "@/components/Clock";
import { MetaHeader } from "@/components/MetaHeader";
import { MetricCard } from "@/components/MetricCard";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Overview() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .runs("?limit=8")
      .then(setRuns)
      .catch(() => setError("API unreachable — start it with: uvicorn api.main:app --port 8000"));
  }, []);

  const latest = runs?.find((r) => r.status === "approved" && r.backtest_results);
  const m = latest?.backtest_results ?? null;

  return (
    <div>
      <MetaHeader page="Overview" index={1} total={7} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase glow">Overview</h1>
        <Badge tone="ok">Paper session</Badge>
        <StubData />
        <span className="flex-1" />
        <UtcClock />
        <ThemeToggle />
      </div>

      {error ? <p className="label text-fail">{error}</p> : null}

      {runs && runs.length === 0 ? (
        <div className="card">
          <p className="mb-2">No pipeline runs yet.</p>
          <Link href="/build" className="label text-accent underline">
            Build your first strategy →
          </Link>
        </div>
      ) : null}

      {m ? (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <MetricCard
              hero
              label="Expectancy / trade"
              value={m.expectancy.toFixed(4)}
              sub="Headline metric — never win rate alone"
            />
          </div>
          <MetricCard label="Profit factor" value={m.profit_factor.toFixed(2)} />
          <MetricCard label="Sharpe" value={m.sharpe.toFixed(2)} />
          <MetricCard label="Max drawdown" value={`${m.max_drawdown_pct.toFixed(1)}%`} />
          <MetricCard
            label="Win rate"
            value={`${m.win_rate_pct.toFixed(1)}%`}
            sub={`exp ${m.expectancy.toFixed(4)} — low WR + asymmetric payoff is healthy`}
          />
        </div>
      ) : null}

      {runs && runs.length > 0 ? (
        <div className="card overflow-x-auto">
          <div className="label mb-3 text-dim">Recent pipeline runs</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="label text-left text-dim">
                <th className="pb-2 pr-4">Run</th>
                <th className="pb-2 pr-4">Prompt</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Expectancy</th>
                <th className="pb-2">Strategy</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-4">{r.id}</td>
                  <td className="max-w-[24rem] truncate py-2 pr-4 font-body">{r.prompt}</td>
                  <td className={`py-2 pr-4 ${r.status === "approved" ? "text-ok" : "text-fail"}`}>
                    {r.status}
                  </td>
                  <td className="py-2 pr-4">
                    {r.backtest_results ? r.backtest_results.expectancy.toFixed(4) : "—"}
                  </td>
                  <td className="py-2">
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
