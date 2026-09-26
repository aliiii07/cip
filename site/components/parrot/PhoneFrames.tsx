"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Drawn iPhone outline with a light screen. Children render inside it. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[610px] w-[300px] rounded-[46px] border-2 border-[#1a1a1a] bg-white p-[7px]">
      <div className="relative h-full w-full overflow-hidden rounded-[38px] border border-[#1a1a1a] bg-parrot-screen">
        <div className="absolute left-1/2 top-0 z-10 h-[26px] w-[150px] -translate-x-1/2 rounded-b-[16px] bg-white">
          <span className="absolute left-1/2 top-[9px] h-[5px] w-[36px] -translate-x-1/2 rounded-full bg-[#CFCFCF]" />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ticker letters in a plain circle; no company marks anywhere. */
function TickerCircle({ ticker, size = 44 }: { ticker: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] font-display font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.27, letterSpacing: "0.02em" }}
    >
      {ticker}
    </span>
  );
}

function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="font-display text-[24px] font-bold leading-tight text-[#1a1a1a]">{title}</div>
      {subtitle ? <div className="mt-0.5 text-[13px] text-[#4a4a4a]">{subtitle}</div> : null}
    </div>
  );
}

export interface ScreenProps {
  active?: boolean;
}

/* ------------------------------------------------------------ screen 1 */
const COMPANIES = [
  { ticker: "AAPL", name: "Apple", move: "+1.2%", up: true, selected: true },
  { ticker: "NVDA", name: "Nvidia", move: "+2.8%", up: true },
  { ticker: "MSFT", name: "Microsoft", move: "+0.6%", up: true },
  { ticker: "AMZN", name: "Amazon", move: "−0.4%", up: false },
  { ticker: "TSLA", name: "Tesla", move: "+3.1%", up: true },
] as const;

export function ScreenPick(_: ScreenProps) {
  return (
    <PhoneFrame>
      <div className="px-5 pt-14">
        <ScreenTitle title="Pick a Company" subtitle="50 top NASDAQ companies" />
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[13px] text-[#9a9a9a]">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#9a9a9a" strokeWidth="2" aria-hidden>
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          Search a company...
        </div>
        <ul className="mt-4 space-y-2.5">
          {COMPANIES.map((c) => {
            const selected = "selected" in c && c.selected;
            return (
              <li
                key={c.ticker}
                className={`flex items-center gap-3 rounded-[20px] bg-white px-3 py-2.5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)] ${
                  selected ? "ring-2 ring-parrot-lime" : ""
                }`}
              >
                <span className="relative">
                  <TickerCircle ticker={c.ticker} />
                  {selected ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#5FB320] text-[11px] text-white">
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-semibold text-[#1a1a1a]">{c.name}</span>
                  <span className="block text-[12px] text-[#6a6a6a]">{c.ticker}</span>
                </span>
                <span className={`font-display text-[14px] font-semibold ${c.up ? "text-[#5FB320]" : "text-[#D64545]"}`}>
                  {c.move}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </PhoneFrame>
  );
}

/* ------------------------------------------------------------ screen 2 */
const STORY = [
  { heading: "What they do", body: "Makes the iPhone, Mac, and services used by over a billion people." },
  { heading: "How they're doing", body: "Revenue growing, strong profits, low debt." },
  { heading: "What's happening now", body: "New product launch this month, shares up this week." },
] as const;

export function ScreenStory(_: ScreenProps) {
  return (
    <PhoneFrame>
      <div className="px-5 pt-12">
        <span className="inline-block rounded-full bg-parrot-lime px-3 py-1 text-[11px] font-semibold text-[#1a1a1a]">
          Plain English
        </span>
        <div className="mt-3 flex items-center gap-3">
          <TickerCircle ticker="AAPL" size={40} />
          <ScreenTitle title="Apple" subtitle="AAPL · Technology" />
        </div>
        <div className="mt-5 space-y-3">
          {STORY.map((s) => (
            <div key={s.heading} className="rounded-[20px] bg-white px-4 py-3.5 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a6a6a]">{s.heading}</div>
              <p className="mt-1 text-[14px] leading-snug text-[#1a1a1a]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ------------------------------------------------------------ screen 3 */
const CHECKS = [
  "Reading the annual report",
  "Checking live market data",
  "Scanning the latest news",
  "Pulling the key numbers",
];

export function ScreenResearch({ active = false }: ScreenProps) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(0);

  // Ticks appear one after another each time this step becomes active.
  useEffect(() => {
    if (!active) {
      setDone(0);
      return;
    }
    if (reduced) {
      setDone(CHECKS.length);
      return;
    }
    setDone(0);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setDone(n);
      if (n >= CHECKS.length) clearInterval(id);
    }, 550);
    return () => clearInterval(id);
  }, [active, reduced]);

  return (
    <PhoneFrame>
      <div className="px-5 pt-14">
        <ScreenTitle title="Researching Apple" />
        <ul className="mt-6 space-y-3">
          {CHECKS.map((label, i) => {
            const checked = i < done;
            return (
              <li
                key={label}
                className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]"
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] transition-colors duration-300 ${
                    checked ? "border-[#5FB320] bg-[#5FB320] text-white" : "border-[#CFCFCF] bg-white text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span className={`text-[14px] transition-colors duration-300 ${checked ? "text-[#1a1a1a]" : "text-[#8a8a8a]"}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 rounded-[20px] bg-white px-4 py-5 text-center shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]">
          <div className="font-display text-[44px] font-bold leading-none text-[#1a1a1a]">142</div>
          <div className="mt-1.5 text-[13px] text-[#4a4a4a]">pages read in 6 seconds</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ------------------------------------------------------------ screen 4 */
const STRATEGY_PATH = "M0 96 C20 92 30 84 46 80 S72 62 90 58 S120 48 138 40 S172 30 190 22 S220 14 240 8";
const HOLD_PATH = "M0 96 C24 94 40 90 60 86 S100 78 130 72 S180 64 210 58 S230 54 240 50";

export function ScreenBacktest({ active = false }: ScreenProps) {
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  // The lines draw themselves each time this step becomes active.
  useEffect(() => {
    if (!active) {
      setDrawn(false);
      return;
    }
    if (reduced) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    const id = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(id);
  }, [active, reduced]);

  const lineStyle = (delay: number): React.CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: drawn ? 0 : 1,
    transition: reduced ? "none" : `stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
  });

  return (
    <PhoneFrame>
      <div className="px-5 pt-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-parrot-lime px-3 py-1 text-[11px] font-semibold text-[#1a1a1a]">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1a1a1a] text-[8px] text-parrot-lime">✓</span>
          Verified by CIP
        </span>
        <div className="mt-3">
          <ScreenTitle title="Backtest Result" subtitle="Apple, 5 years of history" />
        </div>

        <div className="mt-5 rounded-[20px] bg-white px-4 pb-3 pt-4 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]">
          <svg viewBox="0 0 240 110" className="h-[130px] w-full" aria-hidden>
            {[24, 48, 72, 96].map((y) => (
              <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="#EDEDED" strokeWidth="1" />
            ))}
            <path d={HOLD_PATH} fill="none" stroke="#B8B8B8" strokeWidth="2.5" strokeLinecap="round" pathLength={1} style={lineStyle(0)} />
            <path d={STRATEGY_PATH} fill="none" stroke="#5FB320" strokeWidth="3" strokeLinecap="round" pathLength={1} style={lineStyle(0.25)} />
          </svg>
          <div className="mt-1 flex items-center gap-4 text-[11px] text-[#6a6a6a]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-4 rounded-full bg-[#5FB320]" /> Strategy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-4 rounded-full bg-[#B8B8B8]" /> Buy and hold
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Return", "+18.4%", "text-[#5FB320]"],
            ["Max drop", "−9.2%", "text-[#D64545]"],
            ["Risk", "Medium", "text-[#1a1a1a]"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-[16px] bg-white px-2 py-3 text-center shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]">
              <div className="text-[10px] uppercase tracking-[0.06em] text-[#6a6a6a]">{label}</div>
              <div className={`mt-0.5 font-display text-[15px] font-bold ${tone}`}>{value}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-[#9a9a9a]">Illustrative example</p>
      </div>
    </PhoneFrame>
  );
}
