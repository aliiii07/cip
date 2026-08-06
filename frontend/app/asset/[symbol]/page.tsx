"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type AssetAnalysis } from "@/lib/api";
import { SignalBadge, StubDataNotice } from "@/components/Badge";
import { PriceChart } from "@/components/PriceChart";

const TIMEFRAMES = ["1h", "4h", "1d"] as const;

function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function AnalysisCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "ok" | "warn" | "fail";
}) {
  const toneClass =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "fail" ? "text-fail" : "";
  return (
    <div className="stat-card">
      <div className="stat-label mb-1">{title}</div>
      <div className={`text-[15px] font-medium ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-secondary">{detail}</div>
    </div>
  );
}

export default function AssetPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [timeframe, setTimeframe] = useState<string>("4h");
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    api
      .analysis(symbol, timeframe)
      .then(setAnalysis)
      .catch((e) =>
        setError(
          String(e).includes("404")
            ? `"${symbol}" is not in the symbol directory — check the ticker spelling or use the search bar above.`
            : "Could not load the analysis — is the API running on port 8000?"
        )
      )
      .finally(() => setLoading(false));
  }, [symbol, timeframe]);

  if (error) {
    return (
      <div className="card mt-4">
        <p className="text-[13px]">{error}</p>
      </div>
    );
  }
  if (loading || !analysis) {
    return <p className="mt-4 text-[13px] text-secondary">Computing analysis…</p>;
  }

  const { latest } = analysis;
  const trendTone =
    latest.trend.direction === "uptrend"
      ? "ok"
      : latest.trend.direction === "downtrend"
        ? "fail"
        : undefined;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight">
          <span className="mono text-lg">{analysis.symbol}</span>
          <span className="ml-2 text-secondary">{analysis.name}</span>
        </h1>
        <span className="mono text-lg">{fmt(latest.close, 6)}</span>
        <span className="flex-1" />
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-3 py-1 text-[12px] ${
                tf === timeframe ? "bg-accent-bg font-medium text-accent" : "text-secondary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {analysis.stub ? (
        <div className="mb-3">
          <StubDataNotice detail="candles for this asset class are placeholder data until a market data key is configured. Crypto pairs use real Binance data." />
        </div>
      ) : (
        <p className="mb-3 text-[11px] text-secondary">
          Native candles · {analysis.data_source} · refreshed on view (5-minute cache)
        </p>
      )}

      <div className="card mb-4 p-2">
        <PriceChart analysis={analysis} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <AnalysisCard
          title="Trend"
          value={latest.trend.direction}
          detail={`${latest.trend.strength}${
            latest.trend.ema_spread_pct !== undefined
              ? ` · EMA spread ${latest.trend.ema_spread_pct}%`
              : ""
          }`}
          tone={trendTone}
        />
        <AnalysisCard
          title="Momentum"
          value={`RSI ${fmt(latest.momentum.rsi, 1)}`}
          detail={latest.momentum.state}
          tone={
            latest.momentum.state === "oversold"
              ? "warn"
              : latest.momentum.state === "overbought"
                ? "warn"
                : undefined
          }
        />
        <AnalysisCard
          title="Volatility"
          value={`ATR ${fmt(latest.volatility.atr_pct, 2)}%`}
          detail={`${latest.volatility.state} vs recent range`}
        />
        <AnalysisCard
          title="Volume"
          value={latest.volume.ratio ? `${fmt(latest.volume.ratio, 2)}× average` : "—"}
          detail={latest.volume.state}
        />
        <AnalysisCard
          title="Key levels"
          value={
            latest.support
              ? `S ${fmt(latest.support.level, 6)} (−${latest.support.distance_pct}%)`
              : "No support mapped"
          }
          detail={
            latest.resistance
              ? `R ${fmt(latest.resistance.level, 6)} (+${latest.resistance.distance_pct}%)`
              : "No resistance mapped"
          }
        />
      </div>

      <section className="card mb-4">
        <h2 className="mb-2 text-[13px] font-medium">Active signals</h2>
        {analysis.signals.length === 0 ? (
          <p className="text-[13px] text-secondary">
            No qualifying setup detected on this timeframe — that is an honest result, not an
            error. Try another timeframe or check back after the next bar close.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {analysis.signals.map((signal) => (
              <div key={signal.type} className="rounded-lg border border-line bg-raised p-3">
                <div className="mb-1 flex items-center gap-2">
                  <SignalBadge type={signal.type} label={signal.label} />
                  <span className="text-[11px] text-secondary">{signal.timeframe}</span>
                  <span className="flex-1" />
                  <span
                    className="mono text-[12px]"
                    title="Deterministic condition-strength score for this bar. It measures signal quality and consistency, not predicted returns."
                  >
                    {"●".repeat(Math.max(1, Math.round(signal.score * 5)))}
                    {"○".repeat(5 - Math.max(1, Math.round(signal.score * 5)))}
                  </span>
                </div>
                <p className="text-[12px] leading-snug text-secondary">{signal.description}</p>
                {signal.type === "reversal" ? (
                  <p className="mt-1 text-[11px] text-muted">
                    Simplified reversal signal — based on RSI extreme + price reclaim.
                  </p>
                ) : null}
                <Link
                  href={`/build?symbol=${analysis.symbol}&signal=${signal.type}&timeframe=${signal.timeframe}`}
                  className="mt-2 inline-block text-[12px] font-medium text-accent"
                >
                  Build a strategy from this setup →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/build?symbol=${analysis.symbol}`} className="btn-secondary">
          Build a strategy from this asset
        </Link>
        <Link href="/lab" className="btn-ghost">
          Run variant lab on this asset (ships in P5)
        </Link>
      </div>
    </div>
  );
}

