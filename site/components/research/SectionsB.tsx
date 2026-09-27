"use client";

import { displayValue } from "@/lib/format";
import type { EqCheck, Ratios, Segments } from "@/lib/research-types";
import { Card, GREEN, MarkIcon, Missing, RED, SubHead, Tip, xFmt } from "./atoms";
import { SeriesTable, StackedBars } from "./charts";

/* -------------------------------------------------------------- ratios */

export function RatiosSection({ ratios, symbol, meaning }: { ratios: Ratios | null; symbol: string; meaning: string | null }) {
  if (!ratios) {
    return (
      <Card id="ratios" title="Ratios and peers" meaning={meaning}>
        <Missing text="Not reported yet." />
      </Card>
    );
  }
  const cols = [symbol, ...ratios.peers.map((p) => p.ticker)];
  const fmt = (v: number | null, unit: "pct" | "x") => (v == null ? "·" : unit === "pct" ? displayValue(v, "pct") : xFmt(v));
  const shade = (v: number | null, median: number | null, betterHigh: boolean) => {
    if (v == null || median == null || v === median) return "";
    const better = betterHigh ? v > median : v < median;
    return better ? "bg-[#0E7A57]/10" : "bg-[#A12F35]/10";
  };
  return (
    <Card id="ratios" title="Ratios and peers" meaning={meaning} asOf={ratios.asOf} aside={<span>Peers: {ratios.peers.map((p) => p.name).join(", ")}</span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr>
              <th className="py-1.5 text-left font-medium text-[#71717A]">Ratio</th>
              {cols.map((c) => (
                <th key={c} className={`py-1.5 pl-3 text-right font-mono font-semibold ${c === symbol ? "text-[#1a1a1a]" : "text-[#71717A]"}`}>
                  {c}
                </th>
              ))}
              <th className="py-1.5 pl-3 text-right font-mono font-medium text-[#71717A]">Median</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E4E7]">
            {ratios.rows.map((r) => (
              <tr key={r.key}>
                <td className="py-1.5 pr-3 text-[#4a4a4a]">
                  <Tip term={r.label} def={r.definition} />
                </td>
                {cols.map((c) => {
                  const v = c === symbol ? r.own : r.peers[c] ?? null;
                  return (
                    <td key={c} className={`py-1.5 pl-3 text-right font-mono tabular-nums ${shade(v, r.median, r.betterHigh)} ${c === symbol ? "font-semibold" : ""}`}>
                      {fmt(v, r.unit)}
                    </td>
                  );
                })}
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums text-[#71717A]">{fmt(r.median, r.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#71717A]">
        Shaded <span style={{ color: GREEN }}>green</span> when better than the peer median, <span style={{ color: RED }}>red</span> when worse. Higher is better for margins, returns, coverage, the current ratio and yields; lower is better for leverage and valuation multiples. Peers are the largest same sector companies among the NASDAQ 50. Latest fiscal year or trailing twelve months, from each company&apos;s filings; prices from Yahoo Finance.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------ segments */

export function SegmentsSection({ segments, meaning }: { segments: Segments | null; meaning: string | null }) {
  const all = segments ? [...segments.business, ...segments.geographic, ...segments.products] : [];
  return (
    <Card id="segments" title="Segments" meaning={meaning} source={all[0]?.source ?? null}>
      {all.length === 0 ? (
        <Missing text="Not reported by the company in tagged form." />
      ) : (
        <div className="space-y-8">
          {all.map((s) => (
            <div key={`${s.axis}-${s.measure}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SubHead>
                  {s.measure} by {s.axis.toLowerCase()}
                </SubHead>
                <span className="text-[11px] text-[#71717A]">Names exactly as the company reports them, in {segments?.currency}</span>
              </div>
              <div className="mt-3">
                <StackedBars categories={s.years} items={s.items} currency={segments?.currency ?? "USD"} />
              </div>
              <SeriesTable years={s.years} items={s.items} currency={segments?.currency ?? "USD"} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------- earnings quality */

export function EarningsQualitySection({ eq, meaning }: { eq: { checks: EqCheck[]; asOf: string } | null; meaning: string | null }) {
  return (
    <Card id="earnings-quality" title="Earnings quality" meaning={meaning} asOf={eq?.asOf ?? null}>
      {!eq ? (
        <Missing text="Not reported yet." />
      ) : (
        <ul className="divide-y divide-[#E4E4E7]">
          {eq.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <MarkIcon mark={c.mark} title={`${c.mark ?? "Not computable"}. ${c.rule}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="text-[14px] font-semibold">
                    <Tip term={c.label} def={c.rule} />
                  </span>
                  <span className="font-mono text-[13px] tabular-nums" style={{ color: c.mark === "Fail" ? RED : c.mark === "Pass" ? GREEN : "#8a6f14" }}>
                    {c.mark ?? "Not computable"} · {c.display}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-[#4a4a4a]">{c.line}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
