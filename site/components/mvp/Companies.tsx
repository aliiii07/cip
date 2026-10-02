"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EASE_PREMIUM } from "@/lib/motion";
import { COMPANY, LIST_ORDER } from "@/lib/nasdaq50";
import { ACCESS } from "@/lib/parrot-content";
import { useMvp } from "./state";
import { FOCUS_RING } from "./styles";
import styles from "./Companies.module.css";

/**
 * Deterministic per tile variation for the drift: period, phase and
 * direction differ from tile to tile so the field breathes rather than
 * bobbing in unison. Pure function of the index, so server and client agree.
 */
function drift(i: number): React.CSSProperties {
  const r = (k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    "--dur": `${(5 + r(1) * 3).toFixed(2)}s`,
    "--delay": `${(-r(2) * 8).toFixed(2)}s`,
    "--sx": `${((r(3) - 0.5) * 8).toFixed(1)}px`,
    "--sy": `${(-5 - r(4) * 4).toFixed(1)}px`,
    "--rise": `${i * 14}ms`,
  } as React.CSSProperties;
}

/**
 * Page 1: the fifty companies as a field of white tiles on the landing's
 * dark, each with its mark, ticker and name. The whole field fits one screen
 * at every width; tiles drift gently and rise in once. Picking one opens
 * that company's research page in the same tab; the browser's back button
 * returns here.
 */
export function Companies() {
  const { selected, setSelected } = useMvp();
  const router = useRouter();
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  const pick = (symbol: string) => {
    setSelected(symbol);
    router.push(`/prototype/${symbol.toLowerCase()}`);
  };

  return (
    <div className="flex h-full flex-col bg-parrot-dark pb-4 pl-4 pr-[46px] pt-[70px] text-white sm:pl-6 sm:pr-[64px] lg:pb-6 lg:pl-10 lg:pr-[80px] lg:pt-[78px]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.5px] text-white lg:text-[26px]">
            International Companies
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-parrot-muted">
            The 50 NASDAQ companies C.I.P covers. Pick one to research.
          </p>
        </div>
        <p className="hidden text-[12px] leading-snug text-parrot-muted tabular-nums sm:block">50 companies</p>
      </div>

      <ul
        className="mt-3 grid min-h-0 flex-1 grid-cols-5 grid-rows-10 gap-1.5 sm:gap-2 md:grid-cols-8 md:grid-rows-7 lg:mt-4 lg:grid-cols-10 lg:grid-rows-5 lg:gap-3"
        aria-label="Companies"
      >
        {LIST_ORDER.map((symbol, i) => {
          const company = COMPANY[symbol];
          const isSelected = selected === symbol;
          return (
            <li key={symbol} className={`min-h-0 min-w-0 ${styles.rise}`} style={drift(i)}>
              <div className={`h-full ${styles.swim}`}>
                <button
                  type="button"
                  onClick={() => pick(symbol)}
                  aria-label={`${company.name}, ${symbol}`}
                  aria-pressed={isSelected}
                  className={`group flex h-full w-full flex-col items-center justify-center gap-1 rounded-[14px] bg-white px-1 text-[#1a1a1a] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:-translate-y-1 lg:gap-1.5 lg:rounded-[18px] ${
                    isSelected ? "outline outline-2 outline-offset-2 outline-parrot-lime" : ""
                  } ${FOCUS_RING}`}
                  style={{ transitionTimingFunction: EASE_PREMIUM }}
                >
                  {broken.has(symbol) ? (
                    <span className="font-display text-[15px] font-bold leading-none lg:text-[18px]">{symbol}</span>
                  ) : (
                    <Image
                      src={`/logos/marks/${symbol.toLowerCase()}.png`}
                      alt=""
                      width={128}
                      height={128}
                      className="h-[38%] w-auto max-w-[62%] object-contain"
                      onError={() => setBroken((s) => new Set(s).add(symbol))}
                    />
                  )}
                  <span className="text-[10px] font-bold leading-none tracking-[-0.01em] sm:text-[12px] lg:text-[13px]">
                    {symbol}
                  </span>
                  <span className="hidden w-full truncate px-1 text-center text-[11px] leading-none text-[#4a4a4a] md:block">
                    {company.name}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] leading-snug text-parrot-muted">
        {ACCESS.trademark} Logos provided by{" "}
        <a
          href="https://logo.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={`underline decoration-parrot-muted-2 underline-offset-2 transition-colors duration-200 hover:text-white ${FOCUS_RING} rounded-sm`}
        >
          Logo.dev
        </a>
        . Not investment advice.
      </p>
    </div>
  );
}
