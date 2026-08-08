"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { MARKETS, TIMEFRAMES, assetsFor, findAsset } from "@/lib/assets";
import type { AnalyzeResponse, Market, Timeframe } from "@/lib/types";
import { Dashboard } from "@/components/terminal/Dashboard";
import { LoadingTheater } from "@/components/terminal/LoadingTheater";
import { DISCLAIMER } from "@/lib/constants";

/**
 * Surface B. Crossing from the black deck into the warm terminal is the moment
 * the pitch becomes a product — the lobby into the lab.
 *
 * Three taps and a button. A first-timer with no finance background has to be
 * able to finish this without reading anything.
 */
export default function PrototypePage() {
  const [market, setMarket] = useState<Market | null>(null);
  const [asset, setAsset] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);

  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const ready = Boolean(market && asset && timeframe);

  const pickMarket = (m: Market) => {
    setMarket((cur) => (cur === m ? null : m));
    setAsset(null);
    setTimeframe(null);
  };

  const analyze = useCallback(async () => {
    if (!ready || state === "running") return;
    setState("running");
    setError(null);
    setData(null);

    const startedAt = Date.now();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ market, asset, timeframe }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Analysis failed (${res.status}).`);
      }
      const json = (await res.json()) as AnalyzeResponse;

      // Let the four stages land before the dashboard replaces them; the
      // pipeline is the story, not a spinner to be rushed past.
      const elapsed = Date.now() - startedAt;
      if (elapsed < 3200) await new Promise((r) => setTimeout(r, 3200 - elapsed));

      setData(json);
      setState("done");
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setState("error");
    }
  }, [ready, state, market, asset, timeframe]);

  const assets = market ? assetsFor(market) : [];
  const chosen = asset ? findAsset(asset) : undefined;

  return (
    <main className="terminal min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      {/* ------------------------------------------------------------ top */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 pb-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Back to CIP">
          <LogoMark className="h-5 w-6 text-[var(--t-ink)]" />
          <span className="t-label !text-[var(--t-ink)]">CIP</span>
        </Link>
        <span className="t-label">Prototype</span>
        <span className="flex-1" />
        <Link href="/" className="t-label underline-offset-2 hover:underline">
          ← Back to the site
        </Link>
      </div>

      {/* --------------------------------------------------------- picker */}
      <div className="mx-auto max-w-[1400px]">
        <div className="t-frame p-5 sm:p-7">
          <h1 className="text-[19px] tracking-tight">
            Pick a market, an asset and a timeframe.
          </h1>
          <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-[var(--t-muted)]">
            CIP builds a strategy, tests it against real costs, stress-tests it
            over 5,000 simulations, and tells you whether it survived. Paper
            only — nothing is ever ordered.
          </p>

          {/* Step 1 — category */}
          <Step n="1" label="Choose a category" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {MARKETS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => pickMarket(m.key)}
                data-on={market === m.key}
                aria-pressed={market === m.key}
                aria-label={`${m.label} — ${m.note}`}
                className="chip px-4 py-3.5 text-left"
              >
                <div className="text-[14px]">{m.label}</div>
                <div className="mt-0.5 text-[10px] text-[var(--t-muted)]">{m.note}</div>
              </button>
            ))}
          </div>

          {/* Step 2 — asset panel reveals under the chosen category */}
          {market ? (
            <div className="panel-open">
              <Step n="2" label={`Choose an asset — ${market}`} />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {assets.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      setAsset((cur) => (cur === a.key ? null : a.key));
                      setTimeframe(null);
                    }}
                    data-on={asset === a.key}
                    aria-pressed={asset === a.key}
                    aria-label={`${a.label}, ${a.ticker}`}
                    className="chip px-4 py-3.5 text-left"
                  >
                    <div className="text-[14px]">{a.label}</div>
                    <div className="mt-0.5 text-[10.5px] text-[var(--t-muted)]">
                      {a.ticker}
                    </div>
                  </button>
                ))}
              </div>
              {market === "cfd" ? (
                <p className="mt-2.5 max-w-[70ch] text-[10.5px] leading-relaxed text-[var(--t-muted)]">
                  “CFD” is just the bucket label for gold here. CIP models no
                  leverage and no CFD execution — gold is analysed on exactly
                  the same honest paper basis as everything else.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Step 3 — timeframe */}
          {market && asset ? (
            <div className="panel-open">
              <Step n="3" label="Choose a timeframe" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() =>
                      setTimeframe((cur) => (cur === t.key ? null : t.key))
                    }
                    data-on={timeframe === t.key}
                    aria-pressed={timeframe === t.key}
                    className="chip px-4 py-3.5 text-center text-[14px]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[10.5px] text-[var(--t-muted)]">
                Positions are held for several bars even at 15m — CIP targets
                hours to days, never sub-second.
              </p>
            </div>
          ) : null}

          {/* Step 4 — analyze */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[var(--hair)] pt-6">
            <button
              type="button"
              onClick={analyze}
              disabled={!ready || state === "running"}
              className="h-11 rounded-[3px] px-7 text-[12px] uppercase tracking-[0.16em] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              style={{ background: "var(--frame)", color: "#f1f0e9" }}
            >
              {state === "running" ? "Analyzing…" : "Analyze"}
            </button>

            <p className="text-[11px] text-[var(--t-muted)]">
              {ready ? (
                <>
                  {chosen?.label} · {timeframe} — computed the moment you press
                  it. Nothing runs in the background.
                </>
              ) : (
                "Pick all three to continue."
              )}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------- result */}
        <div ref={resultRef} className="scroll-mt-6">
          {state === "running" ? (
            <div className="mt-6">
              <LoadingTheater done={false} />
            </div>
          ) : null}

          {state === "error" ? (
            <div
              className="mt-6 t-panel p-5 text-[12px] leading-relaxed"
              style={{ color: "var(--red-d)" }}
            >
              {error}
              <span className="mt-2 block text-[var(--t-muted)]">
                Nothing was fabricated to fill the gap — try again, or pick
                another asset.
              </span>
            </div>
          ) : null}

          {state === "done" && data ? (
            <div className="mt-6">
              <Dashboard data={data} />
            </div>
          ) : null}
        </div>

        <p className="mx-auto mt-8 max-w-[92ch] pb-10 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
          {DISCLAIMER}
        </p>
      </div>
    </main>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-2.5">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9.5px]"
        style={{ background: "var(--frame)", color: "#f1f0e9" }}
      >
        {n}
      </span>
      <span className="t-label">{label}</span>
    </div>
  );
}
