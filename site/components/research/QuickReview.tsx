"use client";

import type { CompanyResearch, QuickBlock, Sentence } from "@/lib/research-types";
import { CARD, ChipBadge, sourceTitle } from "./atoms";
import { STACK_COLORS } from "./charts";

/**
 * The first impression: six short blocks, every sentence checked against the
 * facts it cites, with those facts and their filings on hover.
 */
export function QuickReview({ research }: { research: CompanyResearch }) {
  const factMap = new Map(research.facts.map((f) => [f.id, f]));
  const titleFor = (s: Sentence) =>
    s.factIds
      .map((id) => factMap.get(id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => `${f.label}: ${f.display} (${sourceTitle(f.source)})`)
      .join("\n") || undefined;

  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.3px] lg:text-[22px]">Quick review</h2>
        <span className="font-mono text-[11px] tabular-nums text-[#71717A]">{research.meta.quickReviewWords} words</span>
      </div>
      <div className="mt-3 divide-y divide-[#E4E4E7]">
        {research.quickReview.map((b) => (
          <Block key={b.key} b={b} titleFor={titleFor} />
        ))}
      </div>
    </div>
  );
}

function Block({ b, titleFor }: { b: QuickBlock; titleFor: (s: Sentence) => string | undefined }) {
  const empty = b.sentences.length === 0 && !(b.items && b.items.length) && !(b.bars && b.bars.length);
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4a4a4a]">{b.title}</h3>
        {b.chip ? <ChipBadge chip={b.chip} /> : null}
      </div>
      {b.bars && b.bars.length ? (
        <div className="mt-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#E4E4E7]">
            {b.bars.map((bar, i) => (
              <span key={bar.name} className="block h-full" style={{ width: `${bar.pct}%`, background: STACK_COLORS[i % STACK_COLORS.length] }} title={`${bar.name} ${bar.pct.toFixed(1)}%`} />
            ))}
          </div>
        </div>
      ) : null}
      {b.sentences.map((s, i) => (
        <p key={i} className="mt-1.5 text-[14px] leading-snug" title={titleFor(s)}>
          {s.text}
        </p>
      ))}
      {b.items?.map((it, i) => (
        <p key={i} className="mt-1.5 flex gap-2 text-[14px] leading-snug">
          {it.date ? <span className="shrink-0 pt-[3px] font-mono text-[11px] tabular-nums text-[#71717A]">{it.date.slice(0, 4)}</span> : null}
          <span>
            {it.text}
            {it.url ? (
              <>
                {" "}
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#71717A] underline decoration-[#A1A1AA] underline-offset-2 hover:text-[#1a1a1a]">
                  {it.source ?? "Source"}
                </a>
              </>
            ) : null}
          </span>
        </p>
      ))}
      {empty ? <p className="mt-1.5 text-[13px] text-[#71717A]">Not reported yet.</p> : null}
    </div>
  );
}
