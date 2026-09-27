import type { HorizonSim } from "./bootstrap";
import type { HealthChip, Level, Mark, Test, TrackChip } from "./verdicts";

/**
 * The shape of data/companies/<TICKER>.json: everything the research page
 * shows except live prices. Written by scripts/research, read by the page.
 * Every number carries its source so the page can show where it came from.
 */

/** Where a value came from: a specific filing, or a named data provider. */
export interface Source {
  /** "10-K", "10-Q", "20-F", "8-K", or a provider name such as "Yahoo Finance". */
  form: string;
  /** Filing date, or the provider's "as of" date. ISO date. */
  filed: string;
  accession?: string;
  url: string;
  fy?: number;
  /** Period end for the value, ISO date. */
  period?: string;
  /** "Income statement", "Balance sheet", "Cash flow", a note name, an item. */
  statement?: string;
  /** XBRL concept the value was read from. */
  concept?: string;
}

export type Unit = "USD" | "shares" | "pct" | "x" | "years" | "count" | "date" | "text" | "usdPerShare";

export interface Fact {
  id: string;
  label: string;
  value: number | string | null;
  unit: Unit;
  /** Exactly what the page prints for this value. */
  display: string;
  source: Source;
}

export interface Sentence {
  text: string;
  factIds: string[];
}

export interface Chip {
  label: string;
  tone: "good" | "neutral" | "bad";
  rule: string;
}

export interface QuickItem {
  date?: string;
  text: string;
  url?: string;
  kind?: "good" | "bad" | "neutral";
  source?: string;
}

export interface QuickBlock {
  key: "money" | "track" | "health" | "moments" | "risks" | "coming";
  title: string;
  chip?: Chip;
  sentences: Sentence[];
  /** Revenue sources for the stacked bar. */
  bars?: { name: string; pct: number; factId: string }[];
  /** Dated items for moments and coming events. */
  items?: QuickItem[];
}

export interface StatementLine {
  key: string;
  label: string;
  /** One per column in Financials.years. */
  values: (number | null)[];
  sources: (Source | null)[];
  /** Shown in the default (short) view. */
  keyLine: boolean;
  /** Year over year change in percent, one per column, null where not computable. */
  yoy: (number | null)[];
  unit: Unit;
}

export interface Financials {
  currency: string;
  /** Column labels, e.g. FY2021 ... FY2025, TTM. */
  years: string[];
  periodEnds: string[];
  income: StatementLine[];
  balance: StatementLine[];
  cashflow: StatementLine[];
  /** Latest filing date the statements draw on. */
  asOf: string;
  latestFiling: Source;
  bars: { year: string; revenue: number | null; operatingIncome: number | null; netIncome: number | null; fcf: number | null }[];
}

export interface RatioRow {
  key: string;
  label: string;
  definition: string;
  unit: "pct" | "x";
  /** True when a higher value reads as better. */
  betterHigh: boolean;
  own: number | null;
  peers: Record<string, number | null>;
  median: number | null;
  factId?: string;
}

export interface Ratios {
  asOf: string;
  peers: { ticker: string; name: string }[];
  rows: RatioRow[];
}

export interface SegmentSeries {
  /** Human name for the axis: "Business segment", "Region", "Product". */
  axis: string;
  measure: "Revenue" | "Operating income";
  years: string[];
  items: { name: string; values: (number | null)[] }[];
  source: Source;
}

export interface Segments {
  business: SegmentSeries[];
  geographic: SegmentSeries[];
  products: SegmentSeries[];
  currency: string;
}

export interface EqCheck {
  key: string;
  label: string;
  value: number | null;
  display: string;
  mark: Mark | null;
  line: string;
  rule: string;
  factIds: string[];
}

export interface BalanceSheetView {
  years: string[];
  ownsOwes: { year: string; assets: number | null; liabilities: number | null; equity: number | null }[];
  cashAndInvestments: Fact | null;
  totalDebt: Fact | null;
  maturities: { label: string; value: number; source: Source }[];
  goodwillIntangiblesPctAssets: Fact | null;
  workingCapital: Fact | null;
  leases: Fact | null;
  purchaseObligations: Fact | null;
  shareCount: { year: string; shares: number | null }[];
  shareCountChangePct: Fact | null;
}

export interface RiskView {
  scorecard: { key: string; label: string; level: Level; rule: string; inputs: string }[];
  factors: { title: string; line: string; url: string }[];
  sourceUrl: string;
}

export interface AuditView {
  auditor: string | null;
  location: string | null;
  since: number | null;
  yearsAsAuditor: number | null;
  opinion: string | null;
  icfrEffective: boolean | null;
  materialWeakness: boolean | null;
  cams: string[];
  auditorChanges: { date: string; url: string }[];
  restatements: { date: string; url: string }[];
  reportDate: string | null;
  sourceUrl: string;
}

export interface ResearchEvent {
  date: string;
  title: string;
  kind: "good" | "bad" | "neutral";
  url: string;
  source: string;
}

export interface Simulation {
  basedOn: { from: string; to: string; days: number; source: string };
  horizons: HorizonSim[];
}

export interface HealthView {
  chip: HealthChip;
  tests: Test[];
  rule: string;
  cashAndInvestments: Fact | null;
  totalDebt: Fact | null;
  fcf: Fact | null;
  interestCoverage: Fact | null;
  netDebtToEbitda: Fact | null;
  currentRatio: Fact | null;
}

export interface TrackView {
  chip: TrackChip;
  rule: string;
  founded: Fact | null;
  tradingSince: Fact | null;
  yearsPublic: Fact | null;
  revenueCagr5y: Fact | null;
  profitableYears: Fact | null;
  yearsCounted: number;
}

export interface CompanyResearch {
  ticker: string;
  name: string;
  cik: string;
  exchange: string;
  country: string;
  currency: string;
  /** Annual form the company files: 10-K, 20-F or 40-F. */
  form: string;
  fiscalYearEnd: string;
  profile: { sector: string | null; industry: string | null; website: string | null; employees: number | null };
  asOf: {
    research: string;
    latestAnnual: Source;
    latestFiling: Source;
    prices: string;
  };
  quickReview: QuickBlock[];
  whatThisMeans: Record<string, Sentence>;
  facts: Fact[];
  revenueSources: { name: string; pct: number; value: number; factId: string }[];
  track: TrackView;
  health: HealthView;
  financials: Financials | null;
  ratios: Ratios | null;
  segments: Segments | null;
  earningsQuality: { checks: EqCheck[]; asOf: string } | null;
  balanceSheet: BalanceSheetView | null;
  risk: RiskView | null;
  audit: AuditView | null;
  simulation: Simulation | null;
  events: { bigMoments: ResearchEvent[]; coming: ResearchEvent[] };
  /** True only when every sentence passed the checker and nothing was dropped. */
  verified: boolean;
  sectionsMissing: string[];
  meta: {
    writer: "anthropic" | "fallback";
    model: string | null;
    dropped: { where: string; text: string; reason: string }[];
    rewritten: number;
    quickReviewWords: number;
  };
}
