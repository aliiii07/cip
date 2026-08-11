"use client";

import type { DecisionMemo as Memo, MemoFactor } from "@/lib/memo";
import type { Timeframe } from "@/lib/types";
import { Panel, SimulatedBadge } from "./atoms";

/**
 * Every setup gets challenged before it gets a verdict.
 *
 * The two columns are deliberately symmetrical: the case against is given the
 * same room and the same typographic weight as the case for. A memo that
 * renders its bull case larger has already made the decision for the reader.
 *
 * Levels come from the selected timeframe and are labelled as such, because a
 * stop computed off daily ATR is meaningless to someone who asked about 1h.
 */

const WEIGHT_BAR: Record<MemoFactor["weight"], number> = {
  strong: 3,
  moderate: 2,
  slight: 1,
};

function FactorList({ factors, tone }: { factors: MemoFactor[]; tone: "green" | "red" }) {
  const color = tone === "green" ? "var(--green-d)" : "var(--red-d)";
  if (factors.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-[var(--t-muted)]">
        Nothing measured argues this side.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {factors.map((f) => (
        <li key={f.label} className="flex gap-2.5">
          {/* weight as three ticks, so relative strength is visible at a glance */}
          <span className="mt-[5px] flex shrink-0 gap-[2px]" aria-label={f.weight}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[3px] w-[3px] rounded-full"
                style={{ background: color, opacity: i < WEIGHT_BAR[f.weight] ? 1 : 0.2 }}
              />
            ))}
          </span>
          <span className="min-w-0">
            <span className="text-[11.5px] font-semibold">{f.label}. </span>
            <span className="text-[11.5px] leading-relaxed text-[var(--t-ink)]">{f.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Level({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-b border-[var(--hair)] py-2 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-label">{label}</span>
        <span className="t-num text-right !text-[12.5px]">{value}</span>
      </div>
      {note ? (
        <p className="mt-0.5 text-[10px] leading-snug text-[var(--t-muted)]">{note}</p>
      ) : null}
    </div>
  );
}


export function DecisionMemo({ memo, timeframe }: { memo: Memo; timeframe: Timeframe }) {
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

  return (
    <Panel
      title="Decision memo"
      code="MEMO"
      aside={
        <>
          <span className="t-label">{timeframe} basis</span>
          <SimulatedBadge />
        </>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--hair)] p-3">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--green-d)" }} />
            <span className="t-label !text-[var(--green-d)]">Why it could work</span>
          </div>
          <FactorList factors={memo.bull} tone="green" />
        </div>

        <div className="rounded-[10px] border border-[var(--hair)] p-3">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--red-d)" }} />
            <span className="t-label !text-[var(--red-d)]">Why it could fail</span>
          </div>
          <FactorList factors={memo.bear} tone="red" />
        </div>
      </div>

      {/* ------------------------------------------------- the memo body */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[10px] border border-[var(--hair)] p-3">
          <div className="t-label mb-1.5">Setup summary</div>
          <p className="text-[12px] leading-relaxed">{memo.setupSummary}</p>

          <div className="t-label mb-1.5 mt-3.5">Chart evidence</div>
          <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {memo.chartEvidence.map((e) => (
              <li key={e} className="text-[11px] leading-snug text-[var(--t-ink)]">
                {e}
              </li>
            ))}
          </ul>

          <div className="t-label mb-1.5 mt-3.5">Invalidation</div>
          <p className="text-[11px] leading-relaxed text-[var(--t-ink)]">
            <span className="t-num !text-[11.5px]">{fmt(memo.invalidation)}</span>
            {" — "}
            {memo.invalidationNote}
          </p>
        </div>

        <div className="rounded-[10px] border border-[var(--hair)] p-3">
          <div className="t-label mb-1">Levels · {timeframe}</div>
          <Level label="Entry" value={fmt(memo.entry)} note="Last close on the selected timeframe." />
          <Level
            label="Stop"
            value={fmt(memo.stop)}
            note={`${memo.riskPct.toFixed(2)}% away — one R, from this timeframe's ATR.`}
          />
          <Level label="Target 2.0R" value={fmt(memo.target2R)} />
          <Level label="Target 3.0R" value={fmt(memo.target3R)} />
          <Level label="Horizon" value={memo.horizon} note="From the rule's bar cap at this timeframe." />
        </div>
      </div>

      <p className="mt-3 rounded-[10px] border border-[var(--hair)] px-3 py-2 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
        <span className="t-label !text-[var(--t-ink)]">How confidence was derived</span>
        <span className="mt-1 block">{memo.confidenceBasis}</span>
      </p>

      {/* --------------------------------------------- human approval --- */}
      <div
        className="mt-3 rounded-[10px] border px-3 py-2.5 text-[11px] leading-relaxed"
        style={{
          borderColor: "rgba(158,75,71,0.32)",
          background: "rgba(158,75,71,0.06)",
          color: "var(--red-d)",
        }}
      >
        <strong className="font-semibold">Human approval required.</strong> These are
        the entry, stop and exit levels of the rule that was just backtested, not
        advice and not a view on direction. Nothing is ordered, no position
        exists, and CIP never acts on capital by itself.
      </div>

      <p className="mt-2.5 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
        Every level above is derived from the {timeframe} series you selected —
        its ATR, its structure and its bar cap. Choosing a different timeframe
        produces different levels, because it is a different question.
      </p>
    </Panel>
  );
}
