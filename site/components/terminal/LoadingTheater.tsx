"use client";

import { useEffect, useState } from "react";

/**
 * The wait is a feature, not a spinner.
 *
 * Four agents light up in order while the request is in flight. The stages
 * are paced by timers rather than server events — the route is single-shot —
 * but the final stage holds until the response actually lands, so the
 * theater never claims to have finished work that is still running.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const id = setTimeout(() => setStage((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [stage]);

  return (
    <div
      className="t-panel mx-auto max-w-[520px] p-6 transition-all duration-500"
      style={{
        transitionTimingFunction: "var(--ease-premium)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(10px) scale(0.98)",
      }}
    >
      <div className="t-label flex items-center gap-1.5">
        <span className="engine-dot" aria-hidden />
        Pipeline
      </div>

      <ol className="mt-5 space-y-4">
        {STAGES.map(([name, detail], i) => {
          const state =
            done || i < stage ? "done" : i === stage ? "active" : "idle";
          return (
            <li key={name} className="flex items-start gap-3">
              <span className="stage-dot mt-[7px]" data-state={state} />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[13px] font-semibold transition-colors duration-500"
                  style={{
                    color: state === "idle" ? "var(--t-faint)" : "var(--t-ink)",
                  }}
                >
                  {name}
                </div>
                <div className="text-[11px] text-[var(--t-muted)]">
                  {state === "idle" ? "queued" : detail}
                </div>
                {state === "active" ? (
                  <div className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-[var(--hair)]">
                    <div className="h-full w-1/3 animate-[shimmer_1.1s_var(--ease-premium)_infinite] rounded-full bg-[var(--amber)]" />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 border-t border-[var(--hair)] pt-4 text-[11px] leading-relaxed text-[var(--t-muted)]">
        A rejected strategy is a valid outcome. The costs ate the edge, and
        CIP would rather say so now.
      </p>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
