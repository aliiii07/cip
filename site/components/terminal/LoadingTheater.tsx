"use client";

import { useEffect, useState } from "react";

/**
 * The wait is a feature, not a spinner.
 *
 * Four agents light up in order while the request is in flight. The stages are
 * paced by timers rather than server events — the route is single-shot — but
 * the final stage holds until the response actually lands, so the theater never
 * claims to have finished work that is still running.
 */

const STAGES = [
  ["Market Scout", "gathering price, flow and news"],
  ["Strategy Architect", "compiling a typed strategy"],
  ["Backtest Engine", "running on real fills, fees and slippage"],
  ["Risk Cop", "5,000-permutation Monte Carlo"],
] as const;

const STEP_MS = 900;

export function LoadingTheater({ done }: { done: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const id = setTimeout(() => setStage((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [stage]);

  return (
    <div className="t-panel mx-auto max-w-[520px] p-6">
      <div className="t-label">Pipeline</div>

      <ol className="mt-5 space-y-4">
        {STAGES.map(([name, detail], i) => {
          const state =
            done || i < stage ? "done" : i === stage ? "active" : "idle";
          return (
            <li key={name} className="flex items-start gap-3">
              <span className="stage-dot mt-[7px]" data-state={state} />
              <div className="min-w-0">
                <div
                  className="text-[13px]"
                  style={{
                    color:
                      state === "idle" ? "var(--t-faint)" : "var(--t-ink)",
                  }}
                >
                  {name}
                </div>
                <div className="text-[11px] text-[var(--t-muted)]">
                  {state === "idle" ? "queued" : detail}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 border-t border-[var(--hair)] pt-4 text-[11px] leading-relaxed text-[var(--t-muted)]">
        Computed on request. A rejected strategy is a valid outcome — it means
        the costs ate the edge, and CIP would rather tell you that now.
      </p>
    </div>
  );
}
