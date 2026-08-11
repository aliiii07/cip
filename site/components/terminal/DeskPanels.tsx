"use client";

import type { ReactNode } from "react";
import type { DeskAnalysis, Zone, ZoneAnalysis } from "@/lib/analysis";
import { Panel, SimulatedBadge } from "./atoms";

/**
 * The desk grid: participation, structure, momentum, volatility and the two
 * risk readings. Every panel pairs one headline figure with a chart of the
 * series behind it, so the number is never asserted without its evidence.
 *
 * Charts are inline SVG rather than canvas. At this size the shapes are a
 * dozen rects or a single path, SVG stays crisp at any DPR without a devicePixelRatio
 * dance, and it keeps these panels off the animation loop entirely.
 */

const INK = "var(--t-ink)";
const MUTED = "var(--t-muted)";
const GREEN = "var(--green-d)";
const RED = "var(--red-d)";
const HAIR = "var(--hair)";

function Metric({
  label,
  hint,
  value,
  tone,
  chart,
  footer,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  tone?: "green" | "red" | "amber";
  chart: ReactNode;
  footer?: ReactNode;
}) {
  const color =
    tone === "green" ? GREEN : tone === "red" ? RED : tone === "amber" ? "var(--amber-d)" : INK;
  return (
    <div className="flex h-full flex-col rounded-[10px] border border-[var(--hair)] bg-[#f7f6f1] p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-label">{label}</span>
        <span className="t-value text-right text-[15px] leading-none" style={{ color }}>
          {value}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-[var(--t-muted)]">{hint}</p>
      <div className="mt-3 flex-1">{chart}</div>
      {footer ? (
        <div className="mt-2.5 border-t border-[var(--hair)] pt-2 text-[10px] leading-snug text-[var(--t-muted)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[52px] items-center justify-center text-[10px] text-[var(--t-muted)]">
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ volume */

function VolumeChart({ series, directions }: { series: number[]; directions: ("up" | "down")[] }) {
  if (series.length === 0) return <Empty label="No volume reported for this series" />;
  const H = 52;
  const max = Math.max(...series, 1.5);
  const bw = 100 / series.length;
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-[52px] w-full" aria-hidden>
      {/* the 1.0x baseline: at-average participation */}
      <line
        x1="0"
        x2="100"
        y1={H - (1 / max) * H}
        y2={H - (1 / max) * H}
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="2 2"
        vectorEffect="non-scaling-stroke"
      />
      {series.map((v, i) => {
        const h = Math.max(0.8, (v / max) * H);
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.16}
            y={H - h}
            width={bw * 0.68}
            height={h}
            fill={directions[i] === "up" ? GREEN : RED}
            opacity={i === series.length - 1 ? 1 : 0.42}
          />
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------- zones */

function ZoneChart({ data, kind }: { data: ZoneAnalysis; kind: "support" | "resistance" }) {
  if (data.zones.length === 0) return <Empty label="No zone clustered at this lookback" />;
  const H = 62;
  const [lo, hi] = data.domain;
  const span = hi - lo || 1;
  const y = (p: number) => H - ((p - lo) / span) * H;
  const tone = kind === "support" ? GREEN : RED;
  const maxTouch = Math.max(...data.zones.map((z) => z.touches), 1);

  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-[62px] w-full" aria-hidden>
      {data.zones.map((z, i) => {
        // Band thickness carries touch count: a level tested five times is a
        // stronger claim than one that has been touched once.
        const t = 1.2 + (z.touches / maxTouch) * 4;
        return (
          <rect key={i} x="0" y={y(z.price) - t / 2} width="100" height={t} fill={tone} opacity={0.26} />
        );
      })}
      {/* current price, drawn last so it reads on top of every band */}
      <line
        x1="0"
        x2="100"
        y1={y(data.last)}
        y2={y(data.last)}
        stroke={INK}
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ZoneList({ zones }: { zones: Zone[] }) {
  return (
    <div className="space-y-0.5">
      {zones.slice(0, 3).map((z, i) => (
        <div key={i} className="t-num flex justify-between gap-2 !text-[10px]">
          <span>{z.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
          <span>
            {z.distancePct >= 0 ? "+" : "−"}
            {Math.abs(z.distancePct).toFixed(2)}% · {z.touches}×
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ line sparks */

function Spark({
  series,
  zero = false,
  tone = INK,
  fill = false,
}: {
  series: number[];
  zero?: boolean;
  tone?: string;
  fill?: boolean;
}) {
  if (series.length < 2) return <Empty label="Not enough history" />;
  const H = 52;
  const lo = Math.min(...series, zero ? 0 : Math.min(...series));
  const hi = Math.max(...series, zero ? 0 : Math.max(...series));
  const span = hi - lo || 1;
  const x = (i: number) => (i / (series.length - 1)) * 100;
  const y = (v: number) => H - ((v - lo) / span) * H;
  const d = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");

  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-[52px] w-full" aria-hidden>
      {zero ? (
        <line
          x1="0"
          x2="100"
          y1={y(0)}
          y2={y(0)}
          stroke={HAIR}
          strokeWidth="0.6"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {fill ? <path d={`${d} L100 ${H} L0 ${H} Z`} fill={tone} opacity="0.12" /> : null}
      <path d={d} fill="none" stroke={tone} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <circle cx={100} cy={y(series[series.length - 1])} r="1.8" fill={tone} />
    </svg>
  );
}

/* ------------------------------------------------------------------ gauge */

function Gauge({ pct, cap, tone = INK }: { pct: number; cap?: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-1">
      <div className="relative h-[10px] w-full overflow-hidden rounded-full bg-[rgba(35,35,30,0.07)]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${clamped}%`, background: tone, transitionTimingFunction: "var(--ease-premium)" }}
        />
        {cap != null && cap < 100 ? (
          <span
            className="absolute top-0 h-full w-px"
            style={{ left: `${cap}%`, background: "var(--red-d)" }}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="t-num mt-1.5 flex justify-between !text-[9px] !text-[var(--t-muted)]">
        <span>0%</span>
        {cap != null && cap < 100 ? <span>cap {cap}%</span> : null}
        <span>100%</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- grid */

export function DeskPanels({ desk }: { desk: DeskAnalysis }) {
  const v = desk.volume;
  const m = desk.momentum;
  const vol = desk.volatility;
  const ex = desk.exposure;
  const sz = desk.sizing;

  return (
    <Panel title="Desk analysis" code="DESK" aside={<SimulatedBadge />}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Volume"
          hint="Participation and conviction"
          value={v.latestRatio != null ? `${v.latestRatio.toFixed(2)}×` : "—"}
          tone={v.conviction === "high" ? "green" : v.conviction === "low" ? "amber" : undefined}
          chart={<VolumeChart series={v.series} directions={v.directions} />}
          footer={
            v.conviction === "unavailable" ? (
              "This feed reports no volume, so conviction cannot be read."
            ) : (
              <>
                Latest bar against its 20-bar mean. Conviction{" "}
                <strong className="font-semibold">{v.conviction}</strong>
                {v.upVolumeShare != null
                  ? ` · ${(v.upVolumeShare * 100).toFixed(0)}% of recent volume on up bars`
                  : null}
              </>
            )
          }
        />

        <Metric
          label="Support"
          hint="Key support zones below price"
          value={
            desk.support.nearest
              ? `${Math.abs(desk.support.nearest.distancePct).toFixed(2)}%`
              : "—"
          }
          tone="green"
          chart={<ZoneChart data={desk.support} kind="support" />}
          footer={
            desk.support.zones.length ? (
              <ZoneList zones={desk.support.zones} />
            ) : (
              "No support cluster in the lookback window."
            )
          }
        />

        <Metric
          label="Resistance"
          hint="Key resistance zones above price"
          value={
            desk.resistance.nearest
              ? `${Math.abs(desk.resistance.nearest.distancePct).toFixed(2)}%`
              : "—"
          }
          tone="red"
          chart={<ZoneChart data={desk.resistance} kind="resistance" />}
          footer={
            desk.resistance.zones.length ? (
              <ZoneList zones={desk.resistance.zones} />
            ) : (
              "No resistance cluster in the lookback window."
            )
          }
        />

        <Metric
          label="Momentum"
          hint="Rate of change and acceleration"
          value={m.rocPct != null ? `${m.rocPct >= 0 ? "+" : "−"}${Math.abs(m.rocPct).toFixed(2)}%` : "—"}
          tone={m.rocPct == null ? undefined : m.rocPct >= 0 ? "green" : "red"}
          chart={<Spark series={m.series} zero tone={m.rocPct != null && m.rocPct >= 0 ? GREEN : RED} />}
          footer={
            m.state === "unavailable" ? (
              "Not enough history to measure acceleration."
            ) : (
              <>
                10-bar rate of change, <strong className="font-semibold">{m.state}</strong>
                {m.accelerationPct != null
                  ? ` · acceleration ${m.accelerationPct >= 0 ? "+" : "−"}${Math.abs(m.accelerationPct).toFixed(2)}pp`
                  : null}
                {m.rsi != null ? ` · RSI ${m.rsi.toFixed(0)}` : null}
              </>
            )
          }
        />

        <Metric
          label="Volatility"
          hint="Current regime against its own history"
          value={vol.atrPct != null ? `${vol.atrPct.toFixed(2)}%` : "—"}
          tone={vol.regime === "elevated" ? "amber" : undefined}
          chart={<Spark series={vol.series} tone={MUTED} fill />}
          footer={
            vol.regime === "unavailable" ? (
              "Not enough history for a volatility regime."
            ) : (
              <>
                ATR(14) as a share of price. Regime{" "}
                <strong className="font-semibold">{vol.regime}</strong>
                {vol.percentile != null
                  ? ` · ${(vol.percentile * 100).toFixed(0)}th percentile of its own range`
                  : null}
              </>
            )
          }
        />

        <Metric
          label="Total exposure"
          hint="Share of the window holding a position"
          value={`${ex.utilisationPct.toFixed(0)}%`}
          tone={ex.withinPolicy ? undefined : "red"}
          chart={<Gauge pct={ex.utilisationPct} tone={INK} />}
          footer={
            <>
              Time in market across the out-of-sample window. The rest of the
              time the strategy holds nothing, which is why it is benchmarked
              against buy-and-hold scaled to this same share.
            </>
          }
        />

        <Metric
          label="Position size"
          hint="Size that fits the risk policy"
          value={sz.sizePct != null ? `${sz.sizePct.toFixed(1)}%` : "—"}
          tone={sz.cappedByPolicy ? "amber" : undefined}
          chart={
            sz.sizePct != null ? (
              <Gauge pct={sz.sizePct} cap={sz.maxPositionPct} tone={sz.cappedByPolicy ? "var(--amber-d)" : INK} />
            ) : (
              <Empty label="No ATR available to size from" />
            )
          }
          footer={
            sz.stopDistancePct == null ? (
              "Sizing needs an ATR reading."
            ) : (
              <>
                Risking {sz.riskPerTradePct}% of the simulated account at a stop{" "}
                {sz.stopDistancePct.toFixed(2)}% away.{" "}
                {sz.cappedByPolicy ? (
                  <>
                    Unconstrained size would be {sz.rawSizePct?.toFixed(1)}%, held to the{" "}
                    {sz.maxPositionPct}% position cap.
                  </>
                ) : (
                  <>Inside the {sz.maxPositionPct}% position cap.</>
                )}
              </>
            )
          }
        />
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
        Every figure here is computed from the same candles the chart above
        draws. Sizing and exposure are platform policy, hardcoded and not
        overridable by any agent. Simulated throughout — no position exists.
      </p>
    </Panel>
  );
}
