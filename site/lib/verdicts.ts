/**
 * Every verdict chip, mark and level on the research page comes from the
 * fixed rules in this one file. No model judgement anywhere: the writer is
 * handed the result and may describe it, never decide it. The rule text is
 * shown on the chip's tooltip, so a reader can check the call themselves.
 *
 * Free of imports so the research script can run it in plain Node.
 */

export type HealthChip = "Strong" | "Moderate" | "Weak";
export type TrackChip = "Strong" | "Mixed" | "Weak";
export type Mark = "Pass" | "Watch" | "Fail";
export type Level = "Low" | "Medium" | "High";

export interface Test {
  label: string;
  /** null when an input was not reported, which counts as a fail. */
  pass: boolean | null;
  detail: string;
}

/* --------------------------------------------------------------- health */

export const HEALTH_RULE =
  "Four tests: net debt to EBITDA below 1 (net cash counts as a pass), interest coverage above 10 (no debt counts as a pass), free cash flow positive in each of the last 3 years, current ratio above 1. All pass: Strong. One or two fail: Moderate. Three or four fail: Weak. An input the company did not report counts as a fail.";

export function healthVerdict(input: {
  netDebtToEbitda: number | null;
  netCash: boolean;
  hasDebt: boolean;
  interestCoverage: number | null;
  fcfLast3: (number | null)[];
  currentRatio: number | null;
}): { chip: HealthChip; tests: Test[] } {
  const tests: Test[] = [];

  if (input.netCash) {
    tests.push({ label: "Net debt to EBITDA below 1", pass: true, detail: "Net cash position" });
  } else if (input.netDebtToEbitda == null) {
    tests.push({ label: "Net debt to EBITDA below 1", pass: null, detail: "Not reported" });
  } else {
    tests.push({
      label: "Net debt to EBITDA below 1",
      pass: input.netDebtToEbitda < 1,
      detail: `${input.netDebtToEbitda.toFixed(2)}x`,
    });
  }

  if (!input.hasDebt) {
    tests.push({ label: "Interest coverage above 10", pass: true, detail: "No debt" });
  } else if (input.interestCoverage == null) {
    tests.push({ label: "Interest coverage above 10", pass: null, detail: "Interest expense not reported" });
  } else {
    tests.push({
      label: "Interest coverage above 10",
      pass: input.interestCoverage > 10,
      detail: `${input.interestCoverage.toFixed(1)}x`,
    });
  }

  const fcf = input.fcfLast3;
  if (fcf.length < 3 || fcf.some((v) => v == null)) {
    tests.push({ label: "Free cash flow positive, last 3 years", pass: null, detail: "Not reported for all 3 years" });
  } else {
    const allPositive = fcf.every((v) => (v as number) > 0);
    tests.push({
      label: "Free cash flow positive, last 3 years",
      pass: allPositive,
      detail: allPositive ? "Positive in all 3" : `Negative in ${fcf.filter((v) => (v as number) <= 0).length} of 3`,
    });
  }

  if (input.currentRatio == null) {
    tests.push({ label: "Current ratio above 1", pass: null, detail: "Not reported" });
  } else {
    tests.push({
      label: "Current ratio above 1",
      pass: input.currentRatio > 1,
      detail: `${input.currentRatio.toFixed(2)}`,
    });
  }

  const fails = tests.filter((t) => t.pass !== true).length;
  const chip: HealthChip = fails === 0 ? "Strong" : fails <= 2 ? "Moderate" : "Weak";
  return { chip, tests };
}

/* --------------------------------------------------------- track record */

export const TRACK_RULE =
  "Revenue growth of 5% or more per year over 5 years and profitable in 5 of the last 5 years: Strong. Revenue shrinking over 5 years, or profitable in 2 or fewer of the last 5 years: Weak. Anything else: Mixed.";

export function trackRecordVerdict(input: {
  revenueCagr5yPct: number | null;
  profitableYears: number;
  yearsCounted: number;
}): TrackChip {
  const g = input.revenueCagr5yPct;
  if (g == null || input.yearsCounted === 0) return "Mixed";
  if (g < 0 || input.profitableYears <= 2) return "Weak";
  if (g >= 5 && input.profitableYears >= 5 && input.yearsCounted >= 5) return "Strong";
  return "Mixed";
}

/* ------------------------------------------------------ earnings quality */

export const EARNINGS_QUALITY_RULES: Record<string, string> = {
  cashConversion:
    "Operating cash flow divided by net income, latest fiscal year. 1.0 or more: Pass. 0.8 to 1.0: Watch. Below 0.8: Fail.",
  accrualsRatio:
    "Net income minus operating cash flow, divided by average total assets. Within plus or minus 5%: Pass. 5% to 10%: Watch. Above 10%: Fail.",
  sbcPctRevenue:
    "Stock based compensation as a share of revenue. Below 3%: Pass. 3% to 8%: Watch. Above 8%: Fail.",
  receivablesVsRevenue:
    "Receivables growth minus revenue growth, latest year. Up to 5 points: Pass. 5 to 15 points: Watch. Above 15 points: Fail.",
  oneTimeItems:
    "Restructuring, impairment and other one time charges as a share of operating income. Below 5%: Pass. 5% to 15%: Watch. Above 15%: Fail. None reported: Pass.",
  beneishM:
    "Beneish M score from eight reported ratios. Below minus 2.22: Pass. Minus 2.22 to minus 1.78: Watch. Above minus 1.78: Fail.",
};

export function earningsQualityMark(key: string, value: number | null): Mark | null {
  if (value == null) return key === "oneTimeItems" ? "Pass" : null;
  switch (key) {
    case "cashConversion":
      return value >= 1 ? "Pass" : value >= 0.8 ? "Watch" : "Fail";
    case "accrualsRatio": {
      const a = Math.abs(value);
      return a <= 5 ? "Pass" : a <= 10 ? "Watch" : "Fail";
    }
    case "sbcPctRevenue":
      return value < 3 ? "Pass" : value <= 8 ? "Watch" : "Fail";
    case "receivablesVsRevenue":
      return value <= 5 ? "Pass" : value <= 15 ? "Watch" : "Fail";
    case "oneTimeItems":
      return value < 5 ? "Pass" : value <= 15 ? "Watch" : "Fail";
    case "beneishM":
      return value < -2.22 ? "Pass" : value <= -1.78 ? "Watch" : "Fail";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ risk */

export const RISK_RULES: Record<string, string> = {
  market:
    "Worst of two reads on 5 years of daily prices. Annualised volatility: below 25% Low, 25% to 40% Medium, above 40% High. Largest fall from a peak: below 30% Low, 30% to 50% Medium, above 50% High.",
  financial:
    "Net debt to EBITDA: net cash or below 1 Low, 1 to 3 Medium, above 3 High. A current ratio below 1 raises the level by one step.",
  business:
    "From the concentration the company discloses. Any customer above 25% of revenue, or one region above 70%: High. Any customer above 10%, or one region above 50%: Medium. Otherwise, or nothing disclosed: Low.",
  legal:
    "From the legal proceedings section of the latest annual report. Matters the company itself calls material, or a regulator's decision or fine that is pending: High. Named pending cases without that language: Medium. None beyond routine matters: Low.",
};

export function marketRiskLevel(input: { volPct: number | null; maxDrawdownPct: number | null }): Level {
  const vol = input.volPct == null ? "Low" : input.volPct < 25 ? "Low" : input.volPct <= 40 ? "Medium" : "High";
  const dd =
    input.maxDrawdownPct == null
      ? "Low"
      : input.maxDrawdownPct < 30
        ? "Low"
        : input.maxDrawdownPct <= 50
          ? "Medium"
          : "High";
  return worst(vol, dd);
}

export function financialRiskLevel(input: {
  netDebtToEbitda: number | null;
  netCash: boolean;
  currentRatio: number | null;
}): Level {
  let level: Level;
  if (input.netCash || input.netDebtToEbitda == null) level = "Low";
  else if (input.netDebtToEbitda < 1) level = "Low";
  else if (input.netDebtToEbitda <= 3) level = "Medium";
  else level = "High";
  if (input.currentRatio != null && input.currentRatio < 1) level = raise(level);
  return level;
}

export function businessRiskLevel(input: {
  topCustomerPct: number | null;
  topRegionPct: number | null;
}): Level {
  const c = input.topCustomerPct ?? 0;
  const r = input.topRegionPct ?? 0;
  if (c > 25 || r > 70) return "High";
  if (c > 10 || r > 50) return "Medium";
  return "Low";
}

export function legalRiskLevel(input: { materialLanguage: boolean; namedCases: number }): Level {
  if (input.materialLanguage) return "High";
  if (input.namedCases > 0) return "Medium";
  return "Low";
}

const ORDER: Level[] = ["Low", "Medium", "High"];
function worst(a: Level, b: Level): Level {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;
}
function raise(l: Level): Level {
  return ORDER[Math.min(2, ORDER.indexOf(l) + 1)];
}
