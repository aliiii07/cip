"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Run, type Spec } from "@/lib/api";
import { conditionText, stopLossText } from "@/lib/strategy-text";
import { SimulatedBadge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";

interface AuditRow {
  name: string;
  detail: string;
  passed: boolean;
}

export default function StrategyReport() {
  const { id } = useParams<{ id: string }>();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [latestRun, setLatestRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.strategy(id), api.runs(`?strategy_id=${id}&limit=1`)])
      .then(([s, runs]) => {
        setSpec(s.spec);
        setLatestRun(runs[0] ?? null);
      })
      .catch(() => setError("Strategy not found, or the API is not running on port 8000."));
  }, [id]);

  if (error) return <p className="mt-4 text-[13px] text-fail">{error}</p>;
  if (!spec) return <p className="mt-4 text-[13px] text-secondary">Loading…</p>;

  const m = latestRun?.backtest_results ?? null;
  const risk = latestRun?.risk_report ?? null;
  const bc = spec.backtest_config ?? {};

  const audits: AuditRow[] = [
    {
      name: "Rule consistency",
      detail: "Spec validates against strategy schema 1.0.0 plus semantic checks.",
      passed: true,
    },
    {
      name: "Execution logic",
      detail: "Paper-only execution with human approval required — schema constants.",
      passed: spec.execution?.mode === "paper" && spec.execution?.requires_user_approval === true,
    },
    {
      name: "Risk management",
      detail: risk
        ? risk.breached
          ? `Gate breach: ${risk.correction_notes.join("; ")}`
          : "Hardcoded platform gates enforced by the Risk Cop."
        : "No run recorded yet.",
      passed: risk ? !risk.breached : false,
    },
    {
      name: "Data integrity",
      detail: "Point-in-time adjusted, survivorship-bias free, native candles only.",
      passed:
        bc.point_in_time_adjusted === true &&
        bc.survivorship_bias_free === true &&
        bc.candle_type === "native",
    },
    {
      name: "Overfitting check",
      detail: "Out-of-sample divergence bound — lands with the Variant Lab (P5).",
      passed: false,
    },
  ];

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight">{spec.name}</h1>
        {latestRun ? (
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
              latestRun.status === "approved" ? "bg-ok-bg text-ok" : "bg-fail-bg text-fail"
            }`}
          >
            {latestRun.status === "approved" ? "Passed risk gates" : "Rejected by Risk Cop"}
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-[12px] text-secondary">
        <span className="mono">{spec.id}</span> · {spec.archetype} · {spec.asset_class} ·{" "}
        {spec.timeframe} · <span className="mono">{(spec.universe ?? []).join(", ")}</span> · Monte
        Carlo {bc.monte_carlo?.iterations ?? "—"} permutations · robustness ±
        {spec.metadata?.parameter_robustness_pct}%
      </p>

      <div className="mb-4 rounded-lg border border-line-strong bg-accent-bg p-3">
        <span className="text-[12px] font-medium text-accent">
          Human approval required — no strategy activates without an explicit decision. Decision
          memos arrive in P6.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 text-[13px] font-medium">Rules summary</h2>
            <div className="stat-label">Enter when</div>
            <ul className="mb-2 list-inside list-disc text-[13px]">
              {(spec.entry_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <div className="stat-label">Exit when</div>
            <ul className="mb-2 list-inside list-disc text-[13px]">
              {(spec.exit_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <p className="text-[13px]">{stopLossText(spec)}</p>
            <p className="mt-2 text-[12px] text-secondary">
              Source prompt: “{spec.metadata?.source_prompt}”
            </p>
          </div>

          <div className="card">
            <h2 className="mb-1 text-[13px] font-medium">Audit checklist</h2>
            {audits.map((a) => (
              <div key={a.name} className="flex items-start gap-3 border-t border-line py-2">
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    a.passed ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
                  }`}
                >
                  {a.passed ? "Pass" : "Pending"}
                </span>
                <div>
                  <div className="text-[13px]">{a.name}</div>
                  <div className="text-[12px] text-secondary">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {m ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <StatCard hero label="Expectancy / trade" value={m.expectancy.toFixed(4)} />
                </div>
                <StatCard label="Profit factor" value={m.profit_factor.toFixed(2)} />
                <StatCard label="Sortino" value={m.sortino.toFixed(2)} />
                <StatCard
                  label="Max drawdown"
                  value={`${m.max_drawdown_pct.toFixed(1)}%`}
                  sub={`of the 25% platform limit`}
                />
                <StatCard
                  label="Win rate"
                  value={`${m.win_rate_pct.toFixed(1)}%`}
                  sub={`exp ${m.expectancy.toFixed(4)}`}
                />
              </div>
              <div className="card">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[13px] font-medium">
                    Outcome distribution — never the best run alone
                  </h2>
                  <SimulatedBadge />
                </div>
                <table className="w-full text-[12px]">
                  <tbody className="mono">
                    {m.distribution.map((d) => (
                      <tr key={d.run} className="border-t border-line">
                        <td className="py-1 text-secondary">run {d.run}</td>
                        <td>expectancy {d.expectancy.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[12px] text-secondary">
                  The 5,000-permutation histogram and the ±15% robustness sweep arrive with the
                  Variant Lab (P5).
                </p>
              </div>
            </>
          ) : (
            <div className="card">
              <p className="text-[13px] text-secondary">
                No simulated metrics recorded for this strategy yet — run it from the Strategy
                builder.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

