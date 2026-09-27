"use client";

import { money } from "@/lib/format";
import { HAIR, INK, MUTED } from "./atoms";

/**
 * Small SVG charts for the statements, segments and balance sheet. Drawn in
 * a fixed viewBox and scaled to the card, so they need no measurement and
 * no library. Labels in the mono face; values in the card's currency.
 */

const W = 760;

function ticks(max: number, n = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
  return out;
}

export function GroupedBars({
  categories,
  series,
  currency,
  height = 230,
}: {
  categories: string[];
  series: { name: string; color: string; values: (number | null)[] }[];
  currency: string;
  height?: number;
}) {
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  if (all.length === 0) return null;
  const maxPos = Math.max(0, ...all);
  const minNeg = Math.min(0, ...all);
  const top = ticks(maxPos);
  const yMax = top[top.length - 1] || 1;
  const yMin = minNeg < 0 ? -Math.max(...ticks(-minNeg)) : 0;
  const padL = 74;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const H = height;
  const plotH = H - padT - padB;
  const y = (v: number) => padT + ((yMax - v) / (yMax - yMin)) * plotH;
  const groupW = (W - padL - padR) / categories.length;
  const barW = Math.min(26, (groupW * 0.72) / series.length);
  const zero = y(0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#4a4a4a]">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${series.map((s) => s.name).join(", ")} by year`}>
        {[...top, ...(yMin < 0 ? ticks(-yMin).map((t) => -t) : [])].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={HAIR} strokeWidth="1" />
            <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill={MUTED} fontFamily="var(--font-mono)">
              {money(t, currency)}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={zero} y2={zero} stroke={INK} strokeWidth="1" />
        {categories.map((c, ci) => {
          const gx = padL + ci * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={c}>
              {series.map((s, si) => {
                const v = s.values[ci];
                if (v == null) return null;
                const yTop = Math.min(y(v), zero);
                const h = Math.abs(y(v) - zero);
                return (
                  <rect key={s.name} x={gx + si * barW + 1} y={yTop} width={barW - 2} height={Math.max(1, h)} rx="2" fill={s.color}>
                    <title>{`${s.name}, ${c}: ${money(v, currency)}`}</title>
                  </rect>
                );
              })}
              <text x={gx + (barW * series.length) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED} fontFamily="var(--font-mono)">
                {c}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const STACK_COLORS = ["#1a1a1a", "#4a4a4a", "#71717A", "#A1A1AA", "#C9C9CE", "#0E7A57", "#8a6f14", "#5b6f8f"];

export function StackedBars({
  categories,
  items,
  currency,
  height = 230,
  colors = STACK_COLORS,
}: {
  categories: string[];
  items: { name: string; values: (number | null)[] }[];
  currency: string;
  height?: number;
  colors?: string[];
}) {
  const totals = categories.map((_, ci) => items.reduce((s, it) => s + Math.max(0, it.values[ci] ?? 0), 0));
  const maxT = Math.max(...totals, 0);
  if (maxT <= 0) return null;
  const top = ticks(maxT);
  const yMax = top[top.length - 1] || 1;
  const padL = 74;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const H = height;
  const plotH = H - padT - padB;
  const y = (v: number) => padT + ((yMax - v) / yMax) * plotH;
  const groupW = (W - padL - padR) / categories.length;
  const barW = Math.min(44, groupW * 0.56);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#4a4a4a]">
        {items.map((it, i) => (
          <span key={it.name} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colors[i % colors.length] }} />
            {it.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${items.map((i) => i.name).join(", ")} by year`}>
        {top.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={HAIR} strokeWidth="1" />
            <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill={MUTED} fontFamily="var(--font-mono)">
              {money(t, currency)}
            </text>
          </g>
        ))}
        {categories.map((c, ci) => {
          const x = padL + ci * groupW + (groupW - barW) / 2;
          let acc = 0;
          return (
            <g key={c}>
              {items.map((it, i) => {
                const v = Math.max(0, it.values[ci] ?? 0);
                if (v <= 0) return null;
                const y0 = y(acc + v);
                const h = y(acc) - y0;
                acc += v;
                return (
                  <rect key={it.name} x={x} y={y0} width={barW} height={Math.max(0.5, h)} fill={colors[i % colors.length]}>
                    <title>{`${it.name}, ${c}: ${money(v, currency)}`}</title>
                  </rect>
                );
              })}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED} fontFamily="var(--font-mono)">
                {c}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** One thin horizontal bar, for schedules and shares. */
export function HBar({ pct, color = INK }: { pct: number; color?: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-[#E4E4E7]">
      <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </span>
  );
}

/** A compact numbers table for a segment series. */
export function SeriesTable({ years, items, currency }: { years: string[]; items: { name: string; values: (number | null)[] }[]; currency: string }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] text-[12px]">
        <thead>
          <tr>
            <th className="py-1 text-left font-medium text-[#71717A]" />
            {years.map((y) => (
              <th key={y} className="py-1 text-right font-mono font-medium text-[#71717A]">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E4E4E7]">
          {items.map((it) => (
            <tr key={it.name}>
              <td className="py-1 pr-3 text-[#4a4a4a]">{it.name}</td>
              {it.values.map((v, i) => (
                <td key={i} className="py-1 pl-3 text-right font-mono tabular-nums">
                  {v == null ? <span className="text-[#A1A1AA]">·</span> : money(v, currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
