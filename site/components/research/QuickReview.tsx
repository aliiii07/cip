"use client";

import type { CompanyResearch, QuickBlock, Sentence } from "@/lib/research-types";
import { CARD, ChipBadge, sourceTitle } from "./atoms";
import { STACK_COLORS } from "./charts";

/**
 * The first impression: what the company does, six key figures, and eight
 * short blocks in two columns. Every sentence was checked against the facts
 * it cites, which show with their filings on hover. Kept under 150 words.
 */
export function QuickReview({ research }: { research: CompanyResearch }) {
  const factMap = new Map(research.facts.map((f) => [f.id, f]));
  const titleFor = (s: Sentence) =>
    s.factIds
      .map((id) => factMap.get(id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => `${f.label}: ${f.display} (${sourceTitle(f.source)})`)
      .join("\n") || undefined;
  const block = (key: QuickBlock["key"]) => research.quickReview.find((b) => b.key === key);
  const about = block("about");
  const numbers = research.quickNumbers
    .map((n) => ({ label: n.label, fact: factMap.get(n.factId) }))
    .filter((n): n is { label: string; fact: NonNullable<typeof n.fact> } => !!n.fact);
  const left: QuickBlock["key"][] = ["money", "track", "health", "peers"];
  const right: QuickBlock["key"][] = ["risks", "moments", "coming"];

  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.3px] lg:text-[22px]">Quick review</h2>
        <span className="text-[11px] tabular-nums text-[#71717A]">{research.meta.quickReviewWords} words</span>
      </div>

      {about?.sentences[0] ? (
        <p className="mt-3 text-[15px] font-medium leading-snug">
          {about.sentences[0].text}{" "}
          {about.items?.[0]?.url ? (
            <a href={about.items[0].url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[12px] font-normal text-[#71717A] underline decoration-[#A1A1AA] underline-offset-2 hover:text-[#1a1a1a]">
              {about.items[0].source ?? "Source"}
            </a>
          ) : null}
        </p>
      ) : null}

      {numbers.length ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {numbers.map((n) => (
            <div key={n.fact.id} className="rounded-[10px] bg-[#F4F4F5] px-2.5 py-2" title={sourceTitle(n.fact.source)}>
              <div className="text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-[#71717A]">{n.label}</div>
              <div className="mt-1 text-[15px] font-semibold leading-none tabular-nums">{n.fact.display}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-x-8 md:grid-cols-2">
        <div className="divide-y divide-[#E4E4E7] pb-3 md:pb-0">
          {left.map((k) => {
            const b = block(k);
            return b ? <Block key={k} b={b} titleFor={titleFor} /> : null;
          })}
        </div>
        <div className="divide-y divide-[#E4E4E7] border-t border-[#E4E4E7] pt-3 md:border-t-0 md:pt-0">
          {right.map((k) => {
            const b = block(k);
            return b ? <Block key={k} b={b} titleFor={titleFor} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}

function Block({ b, titleFor }: { b: QuickBlock; titleFor: (s: Sentence) => string | undefined }) {
  const empty = b.sentences.length === 0 && !(b.items && b.items.length) && !(b.bars && b.bars.length);
  return (
    <div className="py-3 first:pt-0 last:pb-0 md:first:pt-0">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4a4a4a]">{b.title}</h3>
        {b.chip ? <ChipBadge chip={b.chip} /> : null}
      </div>
      {b.bars && b.bars.length ? (
        <div className="mt-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#E4E4E7]">
            {b.bars.map((bar, i) => (
              <span key={bar.name} className="block h-full" style={{ width: `${bar.pct}%`, background: STACK_COLORS[i % STACK_COLORS.length] }} title={`${bar.name} ${bar.pct.toFixed(1)}%`} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#71717A]">
            {b.bars.map((bar, i) => (
              <span key={bar.name} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: STACK_COLORS[i % STACK_COLORS.length] }} />
                {bar.name} <span className="tabular-nums">{Math.round(bar.pct)}%</span>
              </span>
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
          {it.date ? <span className="shrink-0 pt-[3px] text-[11px] tabular-nums text-[#71717A]">{it.date.slice(0, 4)}</span> : null}
          {it.kind ? <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: it.kind === "good" ? "#0E7A57" : it.kind === "bad" ? "#A12F35" : "#A1A1AA" }} /> : null}
          <span>
            {it.text}
            {it.url ? (
              <>
                {" "}
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[12px] text-[#71717A] underline decoration-[#A1A1AA] underline-offset-2 hover:text-[#1a1a1a]">
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
