"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useQuotes } from "@/components/mvp/useQuotes";
import type { Company, Quote } from "@/lib/nasdaq50";
import type { CompanyResearch } from "@/lib/research-types";
import { CARD, GREEN, LIME, RED, Skeleton } from "./atoms";
import { useActiveSection } from "./hooks";
import { PriceChart } from "./PriceChart";
import { QuickReview } from "./QuickReview";
import { ChartSection, FinancialsSection, ProbabilitiesSection } from "./SectionsA";
import { EarningsQualitySection, RatiosSection, SegmentsSection } from "./SectionsB";
import { AuditSection, BalanceSheetSection, RiskSection } from "./SectionsC";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "chart", label: "Chart" },
  { id: "probabilities", label: "Probabilities" },
  { id: "financials", label: "Financials" },
  { id: "ratios", label: "Ratios & Peers" },
  { id: "segments", label: "Segments" },
  { id: "earnings-quality", label: "Earnings Quality" },
  { id: "balance-sheet", label: "Balance Sheet" },
  { id: "risk", label: "Risk" },
  { id: "audit", label: "Audit" },
];
const TAB_IDS = TABS.map((t) => t.id);

/**
 * The terminal atoms paint with these variables. Re-pointed here to the
 * white card palette so the reused chart and simulation panels keep their
 * language (thin rules, small uppercase labels, mono numbers) in this
 * page's colours.
 */
const VARS = {
  "--t-ink": "#1a1a1a",
  "--t-muted": "#71717A",
  "--t-faint": "#A1A1AA",
  "--hair": "#E4E4E7",
  "--green": GREEN,
  "--green-d": GREEN,
  "--red": RED,
  "--red-d": RED,
  "--amber": "#c9a227",
  "--amber-d": "#8a6f14",
  "--frame": "#1a1a1a",
  "--paper-bg": "#ffffff",
} as React.CSSProperties;

export function ResearchPage({ symbol, company, research }: { symbol: string; company: Company; research: CompanyResearch | null }) {
  const { quotes } = useQuotes();
  const quote = quotes?.find((q) => q.symbol === symbol) ?? null;
  const active = useActiveSection(TAB_IDS);
  const wtm = research?.whatThisMeans ?? {};

  return (
    <div className="min-h-screen bg-parrot-dark pb-16 pt-[72px] text-white" style={VARS}>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <HeaderCard symbol={symbol} company={company} research={research} quote={quote} loading={!quotes} />
        <TabBar active={active} />

        <main className="mt-5 space-y-5">
          <section id="summary" className="scroll-mt-[128px]">
            <div className="grid gap-5 lg:grid-cols-[55fr_45fr]">
              <div className={`${CARD} p-5 sm:p-6`}>
                <h2 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.3px] lg:text-[22px]">Price</h2>
                <div className="mt-3">
                  <PriceChart symbol={symbol} events={research?.events.bigMoments ?? []} currency={research?.currency ?? "USD"} />
                </div>
              </div>
              {research ? (
                <QuickReview research={research} />
              ) : (
                <div className={`${CARD} p-5 sm:p-6`}>
                  <h2 className="font-display text-[20px] font-semibold">Quick review</h2>
                  <p className="mt-3 text-[13px] text-[#71717A]">Research not built yet for {company.name}. Run the research script for {symbol} to fill this page.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[12px] text-parrot-muted">Scroll for the full analysis</p>
          </section>

          <ChartSection symbol={symbol} meaning={wtm.chart?.text ?? null} />
          <ProbabilitiesSection symbol={symbol} simulation={research?.simulation ?? null} meaning={wtm.probabilities?.text ?? null} />
          <FinancialsSection fin={research?.financials ?? null} meaning={wtm.financials?.text ?? null} />
          <RatiosSection ratios={research?.ratios ?? null} symbol={symbol} meaning={wtm.ratios?.text ?? null} />
          <SegmentsSection segments={research?.segments ?? null} meaning={wtm.segments?.text ?? null} />
          <EarningsQualitySection eq={research?.earningsQuality ?? null} meaning={wtm.earningsQuality?.text ?? null} />
          <BalanceSheetSection bs={research?.balanceSheet ?? null} currency={research?.currency ?? "USD"} meaning={wtm.balanceSheet?.text ?? null} asOf={research?.financials?.asOf ?? null} />
          <RiskSection risk={research?.risk ?? null} meaning={wtm.risk?.text ?? null} />
          <AuditSection audit={research?.audit ?? null} meaning={wtm.audit?.text ?? null} />
        </main>

        <footer className="mt-8 space-y-1 text-[12px] leading-relaxed text-parrot-muted">
          <p>Everything here is research, not investment advice. Figures come from company filings. Prices may be delayed.</p>
          {research ? (
            <p className="font-mono text-[11px] tabular-nums">
              Research built {research.asOf.research.slice(0, 10)} from {research.asOf.latestAnnual.form} filed {research.asOf.latestAnnual.filed} and {research.asOf.latestFiling.form} filed {research.asOf.latestFiling.filed}. Words {research.meta.writer === "anthropic" ? `written by ${research.meta.model} from the computed facts` : "assembled from the computed facts by fixed templates"}; {research.meta.dropped.length === 0 ? "every sentence passed the checker" : `${research.meta.dropped.length} sentence(s) removed by the checker`}.
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- header */

function HeaderCard({ symbol, company, research, quote, loading }: { symbol: string; company: Company; research: CompanyResearch | null; quote: Quote | null; loading: boolean }) {
  const country = research?.country ? countryCode(research.country) : "US";
  const exchange = research?.exchange?.toUpperCase().includes("NASDAQ") || !research ? "NASDAQ" : research.exchange.toUpperCase();
  return (
    <div className={`${CARD} flex flex-wrap items-center gap-4 p-5 sm:gap-6 sm:p-6`}>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-[#E4E4E7] bg-white">
        <Image src={`/logos/marks/${symbol.toLowerCase()}.png`} alt="" width={96} height={96} className="h-10 w-10 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-[#71717A]">
          {exchange} · {symbol} ({country})
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-display text-[26px] font-semibold leading-none tracking-[-0.5px] lg:text-[32px]">{company.name}</h1>
          {research?.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1a1a1a]" style={{ background: LIME }} title="Every number and date in the written text matched a computed fact or a cited filing.">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-6" /></svg>
              Verified by CIP
            </span>
          ) : null}
        </div>
        <PriceLine quote={quote} loading={loading} currency={research?.currency ?? "USD"} />
      </div>
    </div>
  );
}

function PriceLine({ quote, loading, currency }: { quote: Quote | null; loading: boolean; currency: string }) {
  const line = useMemo(() => {
    if (!quote) return null;
    const up = quote.changePct >= 0;
    const t = new Date(quote.time * 1000);
    const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(t);
    const ageMin = (Date.now() - quote.time * 1000) / 60000;
    const stamp = quote.marketState === "REGULAR" ? (ageMin > 20 ? "Delayed" : `As of ${time} ET`) : `As of ${time} ET, market closed`;
    return { up, time, stamp };
  }, [quote]);

  if (loading || !quote || !line) {
    return (
      <div className="mt-2 flex items-center gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }
  const sym = currency === "USD" ? "$" : `${currency} `;
  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-mono text-[22px] font-semibold tabular-nums leading-none">
        {sym}
        {quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="font-mono text-[14px] tabular-nums" style={{ color: line.up ? GREEN : RED }}>
        {line.up ? "▲" : "▼"} {line.up ? "+" : "−"}
        {Math.abs(quote.change).toFixed(2)} ({line.up ? "+" : "−"}
        {Math.abs(quote.changePct).toFixed(2)}%)
      </span>
      <span className="text-[12px] text-[#71717A]">Nasdaq · {line.stamp}</span>
    </div>
  );
}

function countryCode(name: string): string {
  const map: Record<string, string> = {
    "United States": "US",
    Netherlands: "NL",
    France: "FR",
    Canada: "CA",
    "United Kingdom": "UK",
    "South Korea": "KR",
    Korea: "KR",
    China: "CN",
    Ireland: "IE",
    Israel: "IL",
    Japan: "JP",
    Germany: "DE",
    Taiwan: "TW",
    Singapore: "SG",
    Switzerland: "CH",
    "Cayman Islands": "KY",
  };
  return map[name] ?? name;
}

/* ---------------------------------------------------------------- tabs */

function TabBar({ active }: { active: string }) {
  // Owns the click: the site's smooth scroll also listens for in page
  // anchors and would scroll the section under the sticky bars, so stop the
  // event here and scroll to the section with the bars' height allowed for.
  const onPick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.getElementById(id);
    if (!el) return;
    const from = window.scrollY;
    const to = Math.max(0, el.getBoundingClientRect().top + from - 120);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, to);
      return;
    }
    // A short expo out glide, driven here so the distance decides nothing.
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      window.scrollTo(0, from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  return (
    <nav className="sticky top-14 z-30 -mx-4 mt-4 border-b border-white/10 bg-parrot-dark/95 backdrop-blur-[6px] sm:mx-0" aria-label="Sections">
      <ul className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-0">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id} className="shrink-0">
              <a
                href={`#${t.id}`}
                onClick={(e) => onPick(e, t.id)}
                aria-current={on ? "true" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition-colors duration-200 ${on ? "border-parrot-lime text-white" : "border-transparent text-parrot-muted hover:text-white"}`}
              >
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
