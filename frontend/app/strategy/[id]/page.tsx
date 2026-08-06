"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Run, type Spec } from "@/lib/api";
import { conditionText, stopLossText } from "@/lib/strategy-text";
import { Simulated } from "@/components/Badge";
import { MetaHeader } from "@/components/MetaHeader";
import { MetricCard } from "@/components/MetricCard";
import { Stamp } from "@/components/Stamp";

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

  if (error) {
    return (
      <div>
        <MetaHeader page="Strategy Report" index={4} total={7} />
        <p className="label text-fail">{error}</p>
      </div>
    );
  }
  if (!spec) {
    return (
      <div>
        <MetaHeader page="Strategy Report" index={4} total={7} />
        <p className="label text-dim">Loading…</p>
      </div>
    );
  }

  const m = latestRun?.backtest_results ?? null;
  const risk = latestRun?.risk_report ?? null;
  const bc = spec.backtest_config ?? {};

  const audits: AuditRow[] = [
    {
      name: "Rule consistency",
      detail: "Spec validates against strategy schema 1.0.0 + semantic checks",
      passed: true,
    },
    {
      name: "Execution logic",
      detail: "Paper-only execution, human approval required (schema constants)",
      passed: spec.execution?.mode === "paper" && spec.execution?.requires_user_approval === true,
    },
    {
      name: "Risk management",
      detail: risk
        ? risk.breached
          ? `Gate breach: ${risk.correction_notes.join("; ")}`
          : "Hardcoded platform gates enforced by Risk Cop"
        : "No run recorded yet",
      passed: risk ? !risk.breached : false,
    },
    {
      name: "Data integrity",
      detail: "Point-in-time adjusted, survivorship-bias free, native candles only",
      passed:
        bc.point_in_time_adjusted === true &&
        bc.survivorship_bias_free === true &&
        bc.candle_type === "native",
    },
    {
      name: "Overfitting check",
      detail: "Out-of-sample divergence bound — lands with the Variant Lab (P5)",
      passed: false,
    },
  ];

  return (
    <div>
      <MetaHeader page="Strategy Report" index={4} total={7} />
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase glow">{spec.name}</h1>
        {latestRun?.status === "approved" ? (
          <Stamp tone="ok">Passed risk gates</Stamp>
        ) : latestRun ? (
          <Stamp tone="fail">Rejected</Stamp>
        ) : null}
      </div>
      <p className="label mb-6 text-dim">
        {spec.id} · {spec.archetype} · {spec.asset_class} · {spec.timeframe} ·{" "}
        {(spec.universe ?? []).join(", ")} · Monte Carlo {bc.monte_carlo?.iterations ?? "—"}{" "}
        permutations · robustness ±{spec.metadata?.parameter_robustness_pct}%
      </p>

      <div className="mb-6 border-2 border-accent p-3">
        <span className="label text-accent">
          Human review required — no strategy activates without explicit approval. Decision memos
          land in P6.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="card mb-6">
            <div className="label mb-3 text-dim">Rules summary</div>
            <div className="label text-dim">Enter when</div>
            <ul className="mb-3 list-inside list-disc text-sm">
              {(spec.entry_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <div className="label text-dim">Exit when</div>
            <ul className="mb-3 list-inside list-disc text-sm">
              {(spec.exit_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <p className="text-sm">{stopLossText(spec)}</p>
            <p className="label mt-3 text-dim">
              Source prompt: “{spec.metadata?.source_prompt}”
            </p>
          </div>

          <div className="card">
            <div className="label mb-3 text-dim">Audit checklist</div>
            {audits.map((a) => (
              <div key={a.name} className="flex items-start gap-3 border-t border-line py-2">
                <span className={`label ${a.passed ? "text-ok" : "text-fail"}`}>
                  {a.passed ? "PASSED" : "PENDING"}
                </span>
                <div>
                  <div className="label">{a.name}</div>
                  <div className="label text-dim">{a.detail}</div>
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
                  <MetricCard hero label="Expectancy / trade" value={m.expectancy.toFixed(4)} />
                </div>
                <MetricCard label="Profit factor" value={m.profit_factor.toFixed(2)} />
                <MetricCard label="Sortino" value={m.sortino.toFixed(2)} />
                <MetricCard label="Max drawdown" value={`${m.max_drawdown_pct.toFixed(1)}%`} />
                <MetricCard
                  label="Win rate"
                  value={`${m.win_rate_pct.toFixed(1)}%`}
                  sub={`exp ${m.expectancy.toFixed(4)}`}
                />
              </div>
              <div className="card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="label text-dim">
                    Distribution across simulated runs — never the best run alone
                  </span>
                  <Simulated />
                </div>
                <table className="w-full font-mono text-xs tabular-nums">
                  <tbody>
                    {m.distribution.map((d) => (
                      <tr key={d.run} className="border-t border-line">
                        <td className="py-1 pr-4 text-dim">run {d.run}</td>
                        <td className="py-1">expectancy {d.expectancy.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="label mt-3 text-dim">
                  Tail Probability Ridge and robustness sweep land with the Variant Lab (P5).
                </p>
              </div>
            </>
          ) : (
            <div className="card">
              <p className="label text-dim">No simulated metrics recorded for this strategy yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
