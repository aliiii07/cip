import type { Unit } from "./research-types";

/**
 * One formatter for every figure the research shows, used by the pipeline
 * when it writes a fact's display text and by the page when it prints a
 * value, so the two can never disagree. Negative numbers use a real minus
 * sign, never a dash.
 */
export function displayValue(v: number | null, unit: Unit, currency = "USD"): string {
  if (v == null) return "Not reported";
  const sym = currency === "USD" ? "$" : `${currency} `;
  switch (unit) {
    case "USD": {
      const a = Math.abs(v);
      const sign = v < 0 ? "−" : "";
      if (a >= 1e12) return `${sign}${sym}${(a / 1e12).toFixed(2)}T`;
      if (a >= 1e9) return `${sign}${sym}${(a / 1e9).toFixed(1)}B`;
      if (a >= 1e6) return `${sign}${sym}${(a / 1e6).toFixed(0)}M`;
      return `${sign}${sym}${a.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    case "shares": {
      const a = Math.abs(v);
      if (a >= 1e9) return `${(a / 1e9).toFixed(2)}B shares`;
      if (a >= 1e6) return `${(a / 1e6).toFixed(0)}M shares`;
      return `${a.toLocaleString("en-US")} shares`;
    }
    case "pct":
      return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;
    case "x":
      return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}x`;
    case "usdPerShare":
      return `${v < 0 ? "−" : ""}${sym}${Math.abs(v).toFixed(2)}`;
    case "years":
      return `${Math.round(v)} years`;
    case "count":
      return `${Math.round(v)}`;
    default:
      return String(v);
  }
}

/** Signed percent with one decimal and a plus sign for gains. */
export function signedPct(v: number | null, dp = 1): string {
  if (v == null) return "Not reported";
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}%`;
}

export function money(v: number | null, currency = "USD"): string {
  return displayValue(v, "USD", currency);
}

/** ISO date → "Oct 31, 2025". */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
