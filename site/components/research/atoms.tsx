"use client";

import type { ReactNode } from "react";
import type { Chip, Fact, Source } from "@/lib/research-types";
import type { Level, Mark } from "@/lib/verdicts";

/**
 * Building blocks for the research page. White cards on the landing's dark,
 * the same radius and shadow as the company tiles; numbers in the mono face
 * with tabular figures; green for good or up, red for bad or down, grey for
 * neutral. Lime is reserved for the active tab, selection and the Verified
 * badge. Every figure carries its source in a tooltip.
 */

export const INK = "#1a1a1a";
export const BODY = "#4a4a4a";
export const MUTED = "#71717A";
export const FAINT = "#A1A1AA";
export const HAIR = "#E4E4E7";
export const GREEN = "#0E7A57";
export const RED = "#A12F35";
export const AMBER = "#8a6f14";
export const LIME = "#B2F200";

export const CARD = "rounded-[18px] bg-white text-[#1a1a1a] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]";

export function sourceTitle(s: Source): string {
  const parts = [s.form];
  if (s.fy) parts.push(`FY${s.fy}`);
  if (s.statement) parts.push(s.statement);
  if (s.period) parts.push(`period ending ${s.period}`);
  parts.push(`filed ${s.filed}`);
  return parts.join(" · ");
}

export function Card({
  id,
  title,
  meaning,
  source,
  asOf,
  aside,
  children,
}: {
  id: string;
  title: string;
  meaning?: string | null;
  source?: Source | null;
  asOf?: string | null;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${CARD} scroll-mt-[128px] p-5 sm:p-6 lg:p-7`}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.3px] lg:text-[22px]">{title}</h2>
          {meaning ? <p className="mt-1 max-w-[70ch] text-[14px] leading-snug text-[#4a4a4a]">{meaning}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-[12px] text-[#71717A]">
          {aside}
          {asOf ? <span className="font-mono tabular-nums">Financials as of {asOf}</span> : null}
          {source ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#A1A1AA] underline-offset-2 transition-colors duration-200 hover:text-[#1a1a1a]"
              title={sourceTitle(source)}
            >
              Source
            </a>
          ) : null}
        </div>
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A fact, printed exactly as the pipeline displayed it, with its source on hover. */
export function Num({ f, fallback = "Not reported", className = "" }: { f: Fact | null | undefined; fallback?: string; className?: string }) {
  if (!f) return <span className={`text-[#71717A] ${className}`}>{fallback}</span>;
  return (
    <span className={`font-mono tabular-nums ${className}`} title={sourceTitle(f.source)}>
      {f.display}
    </span>
  );
}

export function Val({ children, title, className = "" }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`} title={title}>
      {children}
    </span>
  );
}

export function Missing({ text = "Not reported by the company" }: { text?: string }) {
  return <p className="text-[13px] text-[#71717A]">{text}</p>;
}

export function Unavailable({ text = "Data unavailable" }: { text?: string }) {
  return (
    <div className="rounded-[12px] border border-[#E4E4E7] px-4 py-6 text-center text-[13px] text-[#71717A]">{text}</div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#E4E4E7] ${className}`} aria-hidden />;
}

export function Simulated() {
  return <span className="badge-sim">Simulated</span>;
}

const CHIP_TONE = {
  good: "bg-[#0E7A57]/10 text-[#0E7A57]",
  bad: "bg-[#A12F35]/10 text-[#A12F35]",
  neutral: "bg-[#1a1a1a]/[0.06] text-[#4a4a4a]",
};

export function ChipBadge({ chip }: { chip: Chip }) {
  return (
    <span
      className={`inline-flex cursor-help items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${CHIP_TONE[chip.tone]}`}
      title={chip.rule}
    >
      {chip.label}
    </span>
  );
}

export function LevelBadge({ level, rule }: { level: Level; rule?: string }) {
  const tone = level === "Low" ? CHIP_TONE.good : level === "High" ? CHIP_TONE.bad : "bg-[#8a6f14]/10 text-[#8a6f14]";
  return (
    <span className={`inline-flex cursor-help items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`} title={rule}>
      {level}
    </span>
  );
}

/** Pass, Watch, Fail as a small icon with the mark in its tooltip. */
export function MarkIcon({ mark, title }: { mark: Mark | null; title?: string }) {
  const color = mark === "Pass" ? GREEN : mark === "Fail" ? RED : mark === "Watch" ? "#c9a227" : FAINT;
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22`, color }} title={title ?? mark ?? "Not computable"} aria-label={mark ?? "Not computable"}>
      {mark === "Pass" ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-6" /></svg>
      ) : mark === "Fail" ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      ) : mark === "Watch" ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor"><rect x="7" y="3" width="2" height="7" rx="1" /><circle cx="8" cy="12.5" r="1.2" /></svg>
      ) : (
        <span className="text-[10px] font-bold">?</span>
      )}
    </span>
  );
}

export function CheckIcon({ ok, title }: { ok: boolean | null; title?: string }) {
  return <MarkIcon mark={ok == null ? null : ok ? "Pass" : "Fail"} title={title} />;
}

/** A term with its one line definition on hover. */
export function Tip({ term, def }: { term: string; def: string }) {
  return (
    <abbr title={def} className="cursor-help underline decoration-dotted decoration-[#A1A1AA] underline-offset-[3px]">
      {term}
    </abbr>
  );
}

export function SubHead({ children }: { children: ReactNode }) {
  return <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4a4a4a]">{children}</h3>;
}

/** Big number, small label: the tile used across the sections. */
export function Tile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" }) {
  const color = tone === "good" ? GREEN : tone === "bad" ? RED : INK;
  return (
    <div className="rounded-[12px] border border-[#E4E4E7] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A]">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-semibold leading-none tabular-nums" style={{ color }}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-[12px] text-[#71717A]">{sub}</div> : null}
    </div>
  );
}

export function xFmt(v: number | null, dp?: number): string {
  if (v == null) return "Not reported";
  const d = dp ?? (Math.abs(v) >= 20 ? 1 : 2);
  return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}x`;
}
