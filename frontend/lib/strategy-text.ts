// Plain-English rendering of strategy JSON conditions. This renders the
// typed spec -- it never displays or generates code (CLAUDE.md hard rules).
import type { Spec } from "./api";

type Indicator = { type: string; params: Record<string, any> };

export function indicatorText(ind: Indicator): string {
  const p = ind.params ?? {};
  switch (ind.type) {
    case "moving_average":
      return `${(p.ma_type ?? "ma").toUpperCase()}(${p.period}) of ${p.field}`;
    case "donchian_channel":
      return `Donchian(${p.period}) ${p.band} band`;
    case "rsi":
      return `RSI(${p.period})`;
    case "atr":
      return `ATR(${p.period})`;
    case "volume":
      return `${p.agg === "sum" ? "total" : "average"} volume over ${p.period} bars`;
    case "price":
      return `${p.field} price`;
    case "funding_rate":
      return "perp funding rate";
    case "staking_yield":
      return "staking yield";
    default:
      return ind.type;
  }
}

const COMPARATORS: Record<string, string> = {
  crosses_above: "crosses above",
  crosses_below: "crosses below",
  greater_than: "is greater than",
  greater_than_or_equal: "is at least",
  less_than: "is less than",
  less_than_or_equal: "is at most",
  equals: "equals",
};

export function conditionText(cond: {
  indicator: Indicator;
  comparator: string;
  value: number | Indicator;
}): string {
  const left = indicatorText(cond.indicator);
  const op = COMPARATORS[cond.comparator] ?? cond.comparator;
  const right =
    typeof cond.value === "number" ? String(cond.value) : indicatorText(cond.value);
  return `${left} ${op} ${right}`;
}

export function stopLossText(spec: Spec): string {
  const sl = spec.risk_management?.stop_loss;
  if (!sl) return "";
  return sl.type === "atr_multiple"
    ? `Stop loss at ${sl.value}× ATR`
    : `Stop loss at ${sl.value}% from entry`;
}
