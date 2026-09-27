import type { Fact, Sentence } from "../../lib/research-types.ts";

/**
 * The checker. Every number, percentage, multiple and year in a sentence
 * must match a computed fact within display rounding, or a year that appears
 * in the sources. A sentence also fails on an em or en dash, a banned word,
 * or more than twenty words. Failing sentences are rewritten once, then
 * dropped; nothing unverified reaches the page.
 */

export interface CheckResult {
  ok: boolean;
  reason: string;
}

// "Not a forecast" and "no prediction" are the required disclaimers; the
// lookbehind lets those through while the bare words stay banned.
const BANNED =
  /\b(buy|sell|hold|undervalued|overvalued|price target|will rise|will fall|skyrocket|amazing|massive|guaranteed|risk-free|passive income)\b|(?<!not a )(?<!no )\b(predict\w*|forecast\w*)\b/i;

interface Token {
  raw: string;
  value: number;
  unit: "pct" | "x" | "usd" | "plain" | "year";
  decimals: number;
}

const NUMBER =
  /(?<![\w.])(?:[$€£]\s?)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s?(%|x|T|B|M|bn|billion|million|trillion|percent)?(?![\w])/g;

/** Dates and form names are not figures: "2026-11-03" is checked as a date, "8-K" is a name. */
function stripNonFigures(text: string, knownYears: Set<number>): string {
  return text
    .replace(/\b((?:19|20)\d{2})-\d{2}-\d{2}\b/g, (m, y) => (knownYears.has(Number(y)) ? " " : m))
    .replace(/\b(?:\d{1,2}-[KQF]|F-1|S-1|424B\d)\b/gi, " ");
}

function tokens(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const raw = m[0];
    const intPart = m[1].replace(/,/g, "");
    const frac = m[2] ?? "";
    const suffix = (m[3] ?? "").toLowerCase();
    const decimals = frac ? frac.length - 1 : 0;
    let value = Number(`${intPart}${frac}`);
    const isYear = !suffix && !frac && !/[$€£]/.test(raw) && /^(19|20)\d{2}$/.test(intPart);
    if (isYear) {
      out.push({ raw, value, unit: "year", decimals: 0 });
      continue;
    }
    let unit: Token["unit"] = "plain";
    if (suffix === "%" || suffix === "percent") unit = "pct";
    else if (suffix === "x") unit = "x";
    else if (suffix) {
      unit = "usd";
      const mult = suffix === "t" || suffix === "trillion" ? 1e12 : suffix === "b" || suffix === "bn" || suffix === "billion" ? 1e9 : 1e6;
      value = value * mult;
    } else if (/[$€£]/.test(raw)) unit = "usd";
    out.push({ raw, value, unit, decimals });
  }
  return out;
}

/** Does a fact, printed the way the token is printed, read as the token? */
function matches(t: Token, f: Fact): boolean {
  if (typeof f.value !== "number") {
    if (t.unit === "year" && typeof f.value === "string") return f.value.includes(String(t.value));
    return false;
  }
  // Tokens carry no sign ("fell 7.3%"), so the fact's magnitude is what must match.
  const v = Math.abs(f.value);
  const closeAt = (a: number, b: number, dp: number) => Math.abs(a - b) <= 0.5 * Math.pow(10, -dp) + 1e-9;
  switch (t.unit) {
    case "pct":
      return f.unit === "pct" && closeAt(v, t.value, t.decimals);
    case "x":
      return f.unit === "x" && closeAt(v, t.value, t.decimals);
    case "usd": {
      if (f.unit !== "USD" && f.unit !== "usdPerShare") return false;
      // "$0" is a real figure (no debt), and sits below every scale.
      if (t.value === 0) return v === 0;
      // Compare at the token's own scale: "$416.2B" means 416.2 at one decimal in billions.
      for (const scale of [1e12, 1e9, 1e6, 1]) {
        if (t.value >= scale && closeAt(v / scale, t.value / scale, t.decimals)) return true;
      }
      return false;
    }
    case "year":
      return (f.unit === "years" || f.unit === "count" || f.unit === "date") && Math.round(v) === t.value;
    case "plain":
      if (f.unit === "years" || f.unit === "count" || f.unit === "shares") return closeAt(v, t.value, t.decimals);
      if (f.unit === "x") return closeAt(v, t.value, t.decimals);
      if (f.unit === "pct") return closeAt(v, t.value, t.decimals);
      return false;
  }
}

export function checkSentence(s: Sentence, facts: Fact[], knownYears: Set<number>): CheckResult {
  if (/[–—]/.test(s.text)) return { ok: false, reason: "contains a dash" };
  const banned = s.text.match(BANNED);
  if (banned) return { ok: false, reason: `banned word: ${banned[0]}` };
  const words = s.text.trim().split(/\s+/).length;
  if (words > 20) return { ok: false, reason: `${words} words, limit 20` };

  for (const t of tokens(stripNonFigures(s.text, knownYears))) {
    if (t.unit === "year" && knownYears.has(t.value)) continue;
    const cited = facts.filter((f) => s.factIds.includes(f.id));
    if (cited.some((f) => matches(t, f))) continue;
    if (facts.some((f) => matches(t, f))) continue;
    return { ok: false, reason: `"${t.raw}" matches no fact` };
  }
  return { ok: true, reason: "" };
}

export function wordCount(sentences: Sentence[]): number {
  return sentences.reduce((n, s) => n + s.text.trim().split(/\s+/).filter(Boolean).length, 0);
}

/** Years that may appear in text: fiscal years, filing years, event years. */
export function yearsFrom(facts: Fact[], extra: string[]): Set<number> {
  const years = new Set<number>();
  for (const f of facts) {
    if (f.source.fy) years.add(f.source.fy);
    for (const d of [f.source.period, f.source.filed]) {
      const y = d ? Number(d.slice(0, 4)) : NaN;
      if (!Number.isNaN(y)) years.add(y);
    }
    if (typeof f.value === "number" && (f.unit === "years" || f.unit === "count") && f.value > 1800 && f.value < 2100) years.add(Math.round(f.value));
    if (f.unit === "date" && typeof f.value === "string") years.add(Number(f.value.slice(0, 4)));
  }
  for (const d of extra) {
    const y = Number(d.slice(0, 4));
    if (!Number.isNaN(y)) years.add(y);
  }
  return years;
}
