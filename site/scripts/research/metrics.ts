import type { BalanceSheetView, EqCheck, Fact, RatioRow, Source } from "../../lib/research-types.ts";
import {
  EARNINGS_QUALITY_RULES,
  earningsQualityMark,
} from "../../lib/verdicts.ts";
import { displayValue } from "../../lib/format.ts";
import type { BuiltStatements } from "./facts.ts";

/**
 * Ratios, quality checks and the balance sheet view, all computed in plain
 * code from the statement values. Each result that reaches the page is a
 * Fact with the source of the inputs it was built from.
 */

const r1 = (n: number) => Number(n.toFixed(1));
const r2 = (n: number) => Number(n.toFixed(2));
// Ratios keep four decimals so a test like "above 1" runs on the real value,
// not on a display rounding of it; the page prints two.
const r4 = (n: number) => Number(n.toFixed(4));

function derived(id: string, label: string, value: number | null, unit: Fact["unit"], from: Source | null, note: string): Fact | null {
  if (value == null || !from || !Number.isFinite(value)) return null;
  return {
    id,
    label,
    value,
    unit,
    display: displayValue(value, unit),
    source: { ...from, statement: note },
  };
}

export interface Snapshot {
  /** Column index used for the latest fiscal year. */
  fy: number;
  /** Column used for point in time values: latest quarter when present, else FY. */
  now: number;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  interestExpense: number | null;
  pretaxIncome: number | null;
  incomeTax: number | null;
  netIncome: number | null;
  epsDiluted: number | null;
  da: number | null;
  sbc: number | null;
  cfo: number | null;
  capex: number | null;
  fcf: number | null;
  dividends: number | null;
  buybacks: number | null;
  cash: number | null;
  shortTermInvestments: number | null;
  longTermInvestments: number | null;
  receivables: number | null;
  currentAssets: number | null;
  ppe: number | null;
  goodwill: number | null;
  intangibles: number | null;
  totalAssets: number | null;
  currentLiabilities: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  operatingLeases: number | null;
  sharesOutstanding: number | null;
  dilutedShares: number | null;
  /** Source of the FY income statement, used for derived facts. */
  incomeSource: Source | null;
  balanceSource: Source | null;
  cashflowSource: Source | null;
}

/** Latest fiscal year for flows, latest quarter (when filed) for balances. TTM flows when available. */
export function snapshot(b: BuiltStatements): Snapshot {
  const fy = b.columns - 2;
  const ttm = b.ttmColumn;
  const flow = (key: string) => (ttm != null && b.get("income", key, ttm) != null ? b.get("income", key, ttm) : b.get("income", key, fy));
  const cflow = (key: string) => (ttm != null && b.get("cashflow", key, ttm) != null ? b.get("cashflow", key, ttm) : b.get("cashflow", key, fy));
  const bal = (key: string) => (ttm != null && b.get("balance", key, ttm) != null ? b.get("balance", key, ttm) : b.get("balance", key, fy));
  const now = ttm != null && b.get("balance", "totalAssets", ttm) != null ? ttm : fy;
  const src = (statement: "income" | "balance" | "cashflow", key: string, col: number) =>
    (statement === "income" ? b.financials.income : statement === "balance" ? b.financials.balance : b.financials.cashflow).find((l) => l.key === key)?.sources[col] ?? null;

  return {
    fy,
    now,
    revenue: flow("revenue"),
    costOfRevenue: flow("costOfRevenue"),
    grossProfit: flow("grossProfit"),
    operatingIncome: flow("operatingIncome"),
    interestExpense: flow("interestExpense"),
    pretaxIncome: flow("pretaxIncome"),
    incomeTax: flow("incomeTax"),
    netIncome: flow("netIncome"),
    epsDiluted: flow("epsDiluted"),
    da: cflow("da") ?? flow("da"),
    sbc: cflow("sbc") ?? flow("sbc"),
    cfo: cflow("cfo"),
    capex: cflow("capex"),
    fcf: cflow("fcf"),
    dividends: cflow("dividends"),
    buybacks: cflow("buybacks"),
    cash: bal("cash"),
    shortTermInvestments: bal("shortTermInvestments"),
    longTermInvestments: bal("longTermInvestments"),
    receivables: bal("receivables"),
    currentAssets: bal("currentAssets"),
    ppe: bal("ppe"),
    goodwill: bal("goodwill"),
    intangibles: bal("intangibles"),
    totalAssets: bal("totalAssets"),
    currentLiabilities: bal("currentLiabilities"),
    shortTermDebt: bal("shortTermDebt"),
    longTermDebt: bal("longTermDebt"),
    totalLiabilities: bal("totalLiabilities"),
    equity: bal("equity"),
    operatingLeases: bal("operatingLeases"),
    sharesOutstanding: bal("sharesOutstanding"),
    dilutedShares: flow("dilutedShares"),
    incomeSource: src("income", "revenue", ttm != null && b.get("income", "revenue", ttm) != null ? ttm : fy),
    balanceSource: src("balance", "totalAssets", now),
    cashflowSource: src("cashflow", "cfo", ttm != null && b.get("cashflow", "cfo", ttm) != null ? ttm : fy),
  };
}

export function cashAndInvestments(s: Snapshot): number | null {
  if (s.cash == null) return null;
  return s.cash + (s.shortTermInvestments ?? 0) + (s.longTermInvestments ?? 0);
}

export function totalDebt(s: Snapshot): number | null {
  if (s.shortTermDebt == null && s.longTermDebt == null) return null;
  return (s.shortTermDebt ?? 0) + (s.longTermDebt ?? 0);
}

export function ebitda(s: Snapshot): number | null {
  if (s.operatingIncome == null) return null;
  return s.operatingIncome + (s.da ?? 0);
}

/* ------------------------------------------------------------- ratios */

export interface RatioInputs {
  s: Snapshot;
  price: number | null;
  marketCap: number | null;
  /** Prior year snapshot values for averages. */
  prevEquity: number | null;
  prevAssets: number | null;
}

export const RATIO_SPECS: { key: string; label: string; definition: string; unit: "pct" | "x"; betterHigh: boolean }[] = [
  { key: "grossMargin", label: "Gross margin", definition: "Gross profit divided by revenue.", unit: "pct", betterHigh: true },
  { key: "operatingMargin", label: "Operating margin", definition: "Operating income divided by revenue.", unit: "pct", betterHigh: true },
  { key: "netMargin", label: "Net margin", definition: "Net income divided by revenue.", unit: "pct", betterHigh: true },
  { key: "roe", label: "Return on equity (ROE)", definition: "Net income divided by average shareholders' equity.", unit: "pct", betterHigh: true },
  { key: "roic", label: "Return on invested capital (ROIC)", definition: "Operating income after tax, divided by equity plus debt minus cash and investments.", unit: "pct", betterHigh: true },
  { key: "roa", label: "Return on assets (ROA)", definition: "Net income divided by average total assets.", unit: "pct", betterHigh: true },
  { key: "debtToEquity", label: "Debt to equity", definition: "Total debt divided by shareholders' equity.", unit: "x", betterHigh: false },
  { key: "netDebtToEbitda", label: "Net debt to EBITDA", definition: "Debt minus cash and investments, divided by operating income plus depreciation and amortization. Negative means net cash.", unit: "x", betterHigh: false },
  { key: "currentRatio", label: "Current ratio", definition: "Current assets divided by current liabilities.", unit: "x", betterHigh: true },
  { key: "interestCoverage", label: "Interest coverage", definition: "Operating income divided by interest expense.", unit: "x", betterHigh: true },
  { key: "pe", label: "Price to earnings (P/E)", definition: "Share price divided by diluted earnings per share, trailing twelve months.", unit: "x", betterHigh: false },
  { key: "evToEbitda", label: "EV to EBITDA", definition: "Market value plus debt minus cash, divided by EBITDA.", unit: "x", betterHigh: false },
  { key: "priceToSales", label: "Price to sales", definition: "Market value divided by revenue, trailing twelve months.", unit: "x", betterHigh: false },
  { key: "fcfYield", label: "Free cash flow yield", definition: "Free cash flow divided by market value.", unit: "pct", betterHigh: true },
  { key: "dividendYield", label: "Dividend yield", definition: "Dividends paid over the last twelve months, divided by market value.", unit: "pct", betterHigh: true },
];

export function computeRatios(i: RatioInputs): Record<string, number | null> {
  const s = i.s;
  const debt = totalDebt(s);
  const cashInv = cashAndInvestments(s);
  const eb = ebitda(s);
  const pct = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : r1((a / b) * 100));
  const x = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : r4(a / b));
  const avgEquity = s.equity != null ? (i.prevEquity != null ? (s.equity + i.prevEquity) / 2 : s.equity) : null;
  const avgAssets = s.totalAssets != null ? (i.prevAssets != null ? (s.totalAssets + i.prevAssets) / 2 : s.totalAssets) : null;
  const taxRate =
    s.incomeTax != null && s.pretaxIncome != null && s.pretaxIncome > 0
      ? Math.min(0.35, Math.max(0, s.incomeTax / s.pretaxIncome))
      : 0.21;
  const nopat = s.operatingIncome != null ? s.operatingIncome * (1 - taxRate) : null;
  const investedCapital =
    s.equity != null && debt != null ? s.equity + debt - (cashInv ?? 0) : null;
  const netDebt = debt != null && cashInv != null ? debt - cashInv : null;
  const ev = i.marketCap != null && debt != null ? i.marketCap + debt - (cashInv ?? 0) : null;

  return {
    grossMargin: pct(s.grossProfit, s.revenue),
    operatingMargin: pct(s.operatingIncome, s.revenue),
    netMargin: pct(s.netIncome, s.revenue),
    roe: pct(s.netIncome, avgEquity),
    roic: investedCapital != null && investedCapital > 0 ? pct(nopat, investedCapital) : null,
    roa: pct(s.netIncome, avgAssets),
    debtToEquity: s.equity != null && s.equity > 0 ? x(debt, s.equity) : null,
    netDebtToEbitda: eb != null && eb > 0 && netDebt != null ? r4(netDebt / eb) : null,
    currentRatio: x(s.currentAssets, s.currentLiabilities),
    interestCoverage: s.interestExpense != null && s.interestExpense > 0 ? x(s.operatingIncome, s.interestExpense) : null,
    pe: i.price != null && s.epsDiluted != null && s.epsDiluted > 0 ? r1(i.price / s.epsDiluted) : null,
    evToEbitda: ev != null && eb != null && eb > 0 ? r1(ev / eb) : null,
    priceToSales: x(i.marketCap, s.revenue),
    fcfYield: pct(s.fcf, i.marketCap),
    dividendYield: s.dividends != null ? pct(Math.abs(s.dividends), i.marketCap) : null,
  };
}

export function ratioRows(own: Record<string, number | null>, peers: { ticker: string; values: Record<string, number | null> }[]): RatioRow[] {
  return RATIO_SPECS.map((spec) => {
    const peerVals: Record<string, number | null> = {};
    for (const p of peers) peerVals[p.ticker] = p.values[spec.key] ?? null;
    // The median of the peers alone, and only when at least two of them report it.
    const all = peers.map((p) => p.values[spec.key]).filter((v): v is number => v != null).sort((a, b) => a - b);
    const median = all.length >= 2 ? (all.length % 2 ? all[(all.length - 1) / 2] : r2((all[all.length / 2 - 1] + all[all.length / 2]) / 2)) : null;
    return { key: spec.key, label: spec.label, definition: spec.definition, unit: spec.unit, betterHigh: spec.betterHigh, own: own[spec.key] ?? null, peers: peerVals, median, factId: `ratio.${spec.key}` };
  });
}

/* --------------------------------------------------- earnings quality */

export function earningsQuality(b: BuiltStatements, s: Snapshot): { checks: EqCheck[]; facts: Fact[] } {
  const fy = b.columns - 2;
  const prev = fy - 1;
  const g = (st: "income" | "balance" | "cashflow", k: string, c: number) => b.get(st, k, c);
  const facts: Fact[] = [];
  const src = s.incomeSource;

  const cfoFy = g("cashflow", "cfo", fy);
  const niFy = g("income", "netIncome", fy);
  const assetsFy = g("balance", "totalAssets", fy);
  const assetsPrev = g("balance", "totalAssets", prev);
  const revFy = g("income", "revenue", fy);
  const revPrev = g("income", "revenue", prev);
  const recFy = g("balance", "receivables", fy);
  const recPrev = g("balance", "receivables", prev);
  const sbcFy = g("cashflow", "sbc", fy) ?? g("income", "sbc", fy);
  const opFy = g("income", "operatingIncome", fy);
  const oneTime = (g("income", "restructuring", fy) ?? 0) + (g("income", "impairment", fy) ?? 0);
  const oneTimeReported = g("income", "restructuring", fy) != null || g("income", "impairment", fy) != null;

  const cashConversion = cfoFy != null && niFy != null && niFy > 0 ? r2(cfoFy / niFy) : null;
  const avgAssets = assetsFy != null ? (assetsPrev != null ? (assetsFy + assetsPrev) / 2 : assetsFy) : null;
  const accruals = niFy != null && cfoFy != null && avgAssets ? r1(((niFy - cfoFy) / avgAssets) * 100) : null;
  const sbcPct = sbcFy != null && revFy ? r1((sbcFy / revFy) * 100) : null;
  const recGrowth = recFy != null && recPrev ? ((recFy - recPrev) / recPrev) * 100 : null;
  const revGrowth = revFy != null && revPrev ? ((revFy - revPrev) / revPrev) * 100 : null;
  const recVsRev = recGrowth != null && revGrowth != null ? r1(recGrowth - revGrowth) : null;
  const oneTimePct = oneTimeReported && opFy ? r1((Math.abs(oneTime) / Math.abs(opFy)) * 100) : null;
  const m = beneish(b, fy, prev);

  const items: { key: string; label: string; value: number | null; unit: Fact["unit"]; line: (v: number | null) => string }[] = [
    { key: "cashConversion", label: "Cash conversion", value: cashConversion, unit: "x", line: (v) => (v == null ? "Operating cash flow or net income not reported." : `Operating cash flow was ${v.toFixed(2)} times net income.`) },
    { key: "accrualsRatio", label: "Accruals ratio", value: accruals, unit: "pct", line: (v) => (v == null ? "Inputs not reported." : `Net income minus operating cash flow equals ${Math.abs(v).toFixed(1)}% of average assets.`) },
    { key: "sbcPctRevenue", label: "Stock based compensation", value: sbcPct, unit: "pct", line: (v) => (v == null ? "Stock based compensation not reported." : `Stock based pay equals ${v.toFixed(1)}% of revenue.`) },
    { key: "receivablesVsRevenue", label: "Receivables versus revenue", value: recVsRev, unit: "pct", line: (v) => (v == null ? "Receivables or revenue growth not computable." : `Receivables grew ${Math.abs(v).toFixed(1)} points ${v >= 0 ? "faster" : "slower"} than revenue.`) },
    { key: "oneTimeItems", label: "One time items", value: oneTimePct, unit: "pct", line: (v) => (v == null ? "No restructuring or impairment charges tagged in the filings." : `One time charges equal ${v.toFixed(1)}% of operating income.`) },
    { key: "beneishM", label: "Beneish M score", value: m, unit: "x", line: (v) => (v == null ? "One or more of the eight inputs not reported." : `M score of ${v.toFixed(2)}, from the eight reported ratios.`) },
  ];

  const checks: EqCheck[] = items.map((it) => {
    const id = `eq.${it.key}`;
    if (it.value != null && src) {
      facts.push({ id, label: it.label, value: it.value, unit: it.unit, display: it.unit === "x" ? it.value.toFixed(2) : displayValue(it.value, "pct"), source: { ...src, statement: "Computed from the financial statements" } });
    }
    return {
      key: it.key,
      label: it.label,
      value: it.value,
      display: it.value == null ? "Not reported" : it.unit === "x" ? it.value.toFixed(2) : displayValue(it.value, "pct"),
      mark: earningsQualityMark(it.key, it.value),
      line: it.line(it.value),
      rule: EARNINGS_QUALITY_RULES[it.key],
      factIds: it.value != null ? [id] : [],
    };
  });

  return { checks, facts };
}

/** Beneish M score from two consecutive fiscal years. Null if any input is missing. */
function beneish(b: BuiltStatements, t: number, t1: number): number | null {
  if (t1 < 0) return null;
  const g = (st: "income" | "balance" | "cashflow", k: string, c: number) => b.get(st, k, c);
  const rec = [g("balance", "receivables", t), g("balance", "receivables", t1)];
  const rev = [g("income", "revenue", t), g("income", "revenue", t1)];
  const cogs = [g("income", "costOfRevenue", t), g("income", "costOfRevenue", t1)];
  const ca = [g("balance", "currentAssets", t), g("balance", "currentAssets", t1)];
  const ppe = [g("balance", "ppe", t), g("balance", "ppe", t1)];
  const sec = [g("balance", "longTermInvestments", t) ?? 0, g("balance", "longTermInvestments", t1) ?? 0];
  const ta = [g("balance", "totalAssets", t), g("balance", "totalAssets", t1)];
  const dep = [g("cashflow", "da", t) ?? g("income", "da", t), g("cashflow", "da", t1) ?? g("income", "da", t1)];
  const sga = [g("income", "sga", t), g("income", "sga", t1)];
  const cl = [g("balance", "currentLiabilities", t), g("balance", "currentLiabilities", t1)];
  const ltd = [g("balance", "longTermDebt", t) ?? 0, g("balance", "longTermDebt", t1) ?? 0];
  const ni = g("income", "netIncome", t);
  const cfo = g("cashflow", "cfo", t);
  const need = [...rec, ...rev, ...cogs, ...ca, ...ppe, ...ta, ...dep, ...sga, ...cl, ni, cfo];
  if (need.some((v) => v == null || v === 0)) return null;
  const n = (v: number | null) => v as number;
  const dsri = (n(rec[0]) / n(rev[0])) / (n(rec[1]) / n(rev[1]));
  const gm = (k: number) => (n(rev[k]) - n(cogs[k])) / n(rev[k]);
  const gmi = gm(1) / gm(0);
  const aq = (k: number) => 1 - (n(ca[k]) + n(ppe[k]) + n(sec[k])) / n(ta[k]);
  const aqi = aq(0) / aq(1);
  const sgi = n(rev[0]) / n(rev[1]);
  const depi = (n(dep[1]) / (n(dep[1]) + n(ppe[1]))) / (n(dep[0]) / (n(dep[0]) + n(ppe[0])));
  const sgai = (n(sga[0]) / n(rev[0])) / (n(sga[1]) / n(rev[1]));
  const lvgi = ((n(cl[0]) + n(ltd[0])) / n(ta[0])) / ((n(cl[1]) + n(ltd[1])) / n(ta[1]));
  const tata = (n(ni) - n(cfo)) / n(ta[0]);
  const m = -4.84 + 0.92 * dsri + 0.528 * gmi + 0.404 * aqi + 0.892 * sgi + 0.115 * depi - 0.172 * sgai + 4.679 * tata - 0.327 * lvgi;
  return Number.isFinite(m) ? r2(m) : null;
}

/* -------------------------------------------------------- balance sheet */

export function balanceSheetView(
  b: BuiltStatements,
  s: Snapshot,
  maturities: { label: string; value: number; source: Source }[],
  purchaseObligations: Fact | null
): { view: BalanceSheetView; facts: Fact[] } {
  const facts: Fact[] = [];
  const years = b.financials.years.slice(0, b.columns - 1);
  const cols = years.length;
  const ownsOwes = years.map((year, i) => ({
    year,
    assets: b.get("balance", "totalAssets", i),
    liabilities: b.get("balance", "totalLiabilities", i),
    equity: b.get("balance", "equity", i),
  }));
  const bs = s.balanceSource;
  const cashInv = derived("bs.cashAndInvestments", "Cash and investments", cashAndInvestments(s), "USD", bs, "Balance sheet (cash plus short and long term investments)");
  const debt = derived("bs.totalDebt", "Total debt", totalDebt(s), "USD", bs, "Balance sheet (short plus long term debt)");
  const gi = s.totalAssets ? derived("bs.goodwillIntangiblesPct", "Goodwill and intangibles as a share of assets", r1((((s.goodwill ?? 0) + (s.intangibles ?? 0)) / s.totalAssets) * 100), "pct", bs, "Balance sheet (goodwill plus intangibles over total assets)") : null;
  const wc = derived("bs.workingCapital", "Working capital", s.currentAssets != null && s.currentLiabilities != null ? s.currentAssets - s.currentLiabilities : null, "USD", bs, "Balance sheet (current assets minus current liabilities)");
  const leases = derived("bs.leases", "Operating lease liabilities", s.operatingLeases, "USD", bs, "Balance sheet");
  const shareCount = years.map((year, i) => ({ year, shares: b.get("balance", "sharesOutstanding", i) ?? b.get("income", "dilutedShares", i) }));
  const first = shareCount.find((r) => r.shares != null);
  const last = [...shareCount].reverse().find((r) => r.shares != null);
  const change = first && last && first !== last && first.shares ? r1((((last.shares as number) - first.shares) / first.shares) * 100) : null;
  const shareChange = derived("bs.shareCountChange", `Share count change, ${first?.year} to ${last?.year}`, change, "pct", bs, "Balance sheet and income statement share counts");
  for (const f of [cashInv, debt, gi, wc, leases, shareChange]) if (f) facts.push(f);
  for (const m of maturities) facts.push({ id: `bs.maturity.${m.label.replace(/\W+/g, "")}`, label: `Debt due, ${m.label.toLowerCase()}`, value: m.value, unit: "USD", display: displayValue(m.value, "USD"), source: m.source });
  return {
    view: { years: years.slice(0, cols), ownsOwes, cashAndInvestments: cashInv, totalDebt: debt, maturities, goodwillIntangiblesPctAssets: gi, workingCapital: wc, leases, purchaseObligations, shareCount, shareCountChangePct: shareChange },
    facts,
  };
}
