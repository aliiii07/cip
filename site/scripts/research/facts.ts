import type { Fact, Financials, Source, StatementLine, Unit } from "../../lib/research-types.ts";
import { displayValue } from "../../lib/format.ts";
import { ANNUAL_FORMS, filingIndexUrl, type CompanyFacts, type FactEntry } from "./edgar.ts";

/**
 * Financial statements from the XBRL company facts feed.
 *
 * The feed holds every value a company ever tagged, restated copies
 * included. For each fiscal year end this picks the value from the most
 * recently filed annual form that reports it, so the figure is the one the
 * company stands behind today, and records which filing it came from.
 * Trailing twelve months come from the latest quarter: the last fiscal year
 * plus the current year to date, minus the same period a year earlier.
 */

export interface LineSpec {
  key: string;
  label: string;
  /** Concept names tried in order, US GAAP first then IFRS. */
  tags: string[];
  kind: "duration" | "instant";
  unit: Unit;
  keyLine: boolean;
}

export const INCOME_LINES: LineSpec[] = [
  { key: "revenue", label: "Revenue", tags: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax", "Revenue"], kind: "duration", unit: "USD", keyLine: true },
  { key: "costOfRevenue", label: "Cost of revenue", tags: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold", "CostOfSales"], kind: "duration", unit: "USD", keyLine: true },
  { key: "grossProfit", label: "Gross profit", tags: ["GrossProfit"], kind: "duration", unit: "USD", keyLine: true },
  { key: "rnd", label: "Research and development", tags: ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"], kind: "duration", unit: "USD", keyLine: true },
  { key: "sga", label: "Selling, general and administrative", tags: ["SellingGeneralAndAdministrativeExpense", "SellingAndMarketingExpense"], kind: "duration", unit: "USD", keyLine: true },
  { key: "operatingExpenses", label: "Total operating expenses", tags: ["OperatingExpenses", "CostsAndExpenses"], kind: "duration", unit: "USD", keyLine: false },
  { key: "operatingIncome", label: "Operating income", tags: ["OperatingIncomeLoss", "ProfitLossFromOperatingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "interestExpense", label: "Interest expense", tags: ["InterestExpense", "InterestExpenseNonoperating", "InterestExpenseDebt", "InterestAndDebtExpense", "FinanceCosts"], kind: "duration", unit: "USD", keyLine: false },
  { key: "otherIncome", label: "Other income (expense), net", tags: ["NonoperatingIncomeExpense", "OtherNonoperatingIncomeExpense"], kind: "duration", unit: "USD", keyLine: false },
  { key: "pretaxIncome", label: "Income before tax", tags: ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments", "ProfitLossBeforeTax"], kind: "duration", unit: "USD", keyLine: true },
  { key: "incomeTax", label: "Income tax", tags: ["IncomeTaxExpenseBenefit", "IncomeTaxExpenseContinuingOperations"], kind: "duration", unit: "USD", keyLine: true },
  { key: "netIncome", label: "Net income", tags: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic", "ProfitLossAttributableToOwnersOfParent"], kind: "duration", unit: "USD", keyLine: true },
  { key: "epsDiluted", label: "Diluted earnings per share", tags: ["EarningsPerShareDiluted", "DilutedEarningsLossPerShare"], kind: "duration", unit: "usdPerShare", keyLine: true },
  { key: "dilutedShares", label: "Diluted shares (weighted)", tags: ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfDilutedSharesOutstandingAdjusted", "AdjustedWeightedAverageNumberOfOrdinarySharesOutstanding"], kind: "duration", unit: "shares", keyLine: false },
  { key: "da", label: "Depreciation and amortization", tags: ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet", "DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss"], kind: "duration", unit: "USD", keyLine: false },
  { key: "sbc", label: "Stock based compensation", tags: ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"], kind: "duration", unit: "USD", keyLine: false },
  { key: "restructuring", label: "Restructuring charges", tags: ["RestructuringCharges", "RestructuringCosts"], kind: "duration", unit: "USD", keyLine: false },
  { key: "impairment", label: "Impairment charges", tags: ["AssetImpairmentCharges", "GoodwillImpairmentLoss", "ImpairmentLossRecognisedInProfitOrLoss"], kind: "duration", unit: "USD", keyLine: false },
];

export const BALANCE_LINES: LineSpec[] = [
  { key: "cash", label: "Cash and cash equivalents", tags: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "CashAndCashEquivalents"], kind: "instant", unit: "USD", keyLine: true },
  { key: "shortTermInvestments", label: "Short term investments", tags: ["MarketableSecuritiesCurrent", "ShortTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesCurrent", "CurrentInvestments"], kind: "instant", unit: "USD", keyLine: true },
  { key: "receivables", label: "Accounts receivable", tags: ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent", "TradeAndOtherCurrentReceivables"], kind: "instant", unit: "USD", keyLine: true },
  { key: "inventory", label: "Inventories", tags: ["InventoryNet", "Inventories"], kind: "instant", unit: "USD", keyLine: false },
  { key: "currentAssets", label: "Total current assets", tags: ["AssetsCurrent", "CurrentAssets"], kind: "instant", unit: "USD", keyLine: true },
  { key: "ppe", label: "Property, plant and equipment", tags: ["PropertyPlantAndEquipmentNet", "PropertyPlantAndEquipment"], kind: "instant", unit: "USD", keyLine: false },
  { key: "longTermInvestments", label: "Long term investments", tags: ["MarketableSecuritiesNoncurrent", "LongTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesNoncurrent", "NoncurrentInvestments"], kind: "instant", unit: "USD", keyLine: false },
  { key: "goodwill", label: "Goodwill", tags: ["Goodwill"], kind: "instant", unit: "USD", keyLine: false },
  { key: "intangibles", label: "Intangible assets", tags: ["IntangibleAssetsNetExcludingGoodwill", "FiniteLivedIntangibleAssetsNet", "IntangibleAssetsOtherThanGoodwill"], kind: "instant", unit: "USD", keyLine: false },
  { key: "totalAssets", label: "Total assets", tags: ["Assets"], kind: "instant", unit: "USD", keyLine: true },
  { key: "currentLiabilities", label: "Total current liabilities", tags: ["LiabilitiesCurrent", "CurrentLiabilities"], kind: "instant", unit: "USD", keyLine: true },
  { key: "shortTermDebt", label: "Short term debt", tags: ["DebtCurrent", "LongTermDebtCurrent", "ShortTermBorrowings", "CommercialPaper", "CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings"], kind: "instant", unit: "USD", keyLine: true },
  { key: "longTermDebt", label: "Long term debt", tags: ["LongTermDebtNoncurrent", "LongTermDebt", "LongTermDebtAndCapitalLeaseObligations", "NoncurrentBorrowings"], kind: "instant", unit: "USD", keyLine: true },
  { key: "operatingLeases", label: "Operating lease liabilities", tags: ["OperatingLeaseLiability", "OperatingLeaseLiabilityNoncurrent", "LeaseLiabilities"], kind: "instant", unit: "USD", keyLine: false },
  { key: "totalLiabilities", label: "Total liabilities", tags: ["Liabilities"], kind: "instant", unit: "USD", keyLine: true },
  { key: "equity", label: "Shareholders' equity", tags: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "Equity", "EquityAttributableToOwnersOfParent"], kind: "instant", unit: "USD", keyLine: true },
  { key: "sharesOutstanding", label: "Shares outstanding", tags: ["dei:EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding", "NumberOfSharesOutstanding"], kind: "instant", unit: "shares", keyLine: false },
];

export const CASHFLOW_LINES: LineSpec[] = [
  { key: "cfo", label: "Cash from operations", tags: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations", "CashFlowsFromUsedInOperatingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "capex", label: "Capital expenditures", tags: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "fcf", label: "Free cash flow", tags: [], kind: "duration", unit: "USD", keyLine: true },
  { key: "cfi", label: "Cash from investing", tags: ["NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivitiesContinuingOperations", "CashFlowsFromUsedInInvestingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "cff", label: "Cash from financing", tags: ["NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivitiesContinuingOperations", "CashFlowsFromUsedInFinancingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "buybacks", label: "Share repurchases", tags: ["PaymentsForRepurchaseOfCommonStock", "PaymentsToAcquireOrRedeemEntitysShares"], kind: "duration", unit: "USD", keyLine: true },
  { key: "dividends", label: "Dividends paid", tags: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock", "DividendsPaidClassifiedAsFinancingActivities"], kind: "duration", unit: "USD", keyLine: true },
  { key: "debtIssued", label: "Debt issued", tags: ["ProceedsFromIssuanceOfLongTermDebt", "ProceedsFromIssuanceOfDebt", "ProceedsFromBorrowingsClassifiedAsFinancingActivities"], kind: "duration", unit: "USD", keyLine: false },
  { key: "debtRepaid", label: "Debt repaid", tags: ["RepaymentsOfLongTermDebt", "RepaymentsOfDebt", "RepaymentsOfBorrowingsClassifiedAsFinancingActivities"], kind: "duration", unit: "USD", keyLine: false },
  { key: "da", label: "Depreciation and amortization", tags: ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet"], kind: "duration", unit: "USD", keyLine: false },
  { key: "sbc", label: "Stock based compensation", tags: ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"], kind: "duration", unit: "USD", keyLine: false },
];

/** Debt due by year, from the maturity table the company tags. */
export const MATURITY_TAGS: { label: string; tag: string }[] = [
  { label: "Within 1 year", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalInNextTwelveMonths" },
  { label: "Year 2", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalInYearTwo" },
  { label: "Year 3", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalInYearThree" },
  { label: "Year 4", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFour" },
  { label: "Year 5", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFive" },
  { label: "After year 5", tag: "LongTermDebtMaturitiesRepaymentsOfPrincipalAfterYearFive" },
];

/* ------------------------------------------------------------ helpers */

const DAY = 86400000;
function days(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export interface Picked {
  value: number;
  entry: FactEntry;
  concept: string;
}

/** All entries for a concept in a money like unit, across taxonomies. */
export function entriesFor(cf: CompanyFacts, tag: string): { concept: string; entries: FactEntry[] }[] {
  const out: { concept: string; entries: FactEntry[] }[] = [];
  const [prefix, name] = tag.includes(":") ? tag.split(":") : [null, tag];
  const taxonomies = prefix ? [prefix] : ["us-gaap", "ifrs-full"];
  for (const tax of taxonomies) {
    const node = cf.facts[tax]?.[name];
    if (!node) continue;
    for (const [unit, entries] of Object.entries(node.units)) {
      if (!/^(USD|shares|USD\/shares|pure|EUR|GBP|JPY|CNY|KRW|CAD|CHF|SEK|DKK|NOK|HKD|TWD|INR|BRL|ILS)$/i.test(unit)) continue;
      out.push({ concept: `${tax}:${name}`, entries });
    }
  }
  return out;
}

function isAnnualForm(form: string): boolean {
  return ANNUAL_FORMS.includes(form) || ANNUAL_FORMS.some((f) => form.startsWith(`${f}/`));
}

/**
 * The value for a period end: duration lines want a period of about a year
 * ending there, instant lines a balance on that date. Among candidates the
 * latest filed annual form wins, then the latest filed anything.
 */
export function pickAnnual(cf: CompanyFacts, tags: string[], kind: "duration" | "instant", end: string): Picked | null {
  let best: Picked | null = null;
  for (const tag of tags) {
    for (const { concept, entries } of entriesFor(cf, tag)) {
      for (const e of entries) {
        if (e.end !== end) continue;
        if (kind === "duration") {
          if (!e.start) continue;
          const d = days(e.start, e.end);
          if (d < 340 || d > 385) continue;
        } else if (e.start) continue;
        if (!best) best = { value: e.val, entry: e, concept };
        else {
          const bAnnual = isAnnualForm(best.entry.form);
          const eAnnual = isAnnualForm(e.form);
          if ((eAnnual && !bAnnual) || (eAnnual === bAnnual && e.filed > best.entry.filed)) {
            best = { value: e.val, entry: e, concept };
          }
        }
      }
    }
    if (best) return best;
  }
  return best;
}

/** The last N fiscal year ends the company reported revenue for. */
export function fiscalYearEnds(cf: CompanyFacts, n = 5): string[] {
  const ends = new Set<string>();
  for (const tag of INCOME_LINES[0].tags) {
    for (const { entries } of entriesFor(cf, tag)) {
      for (const e of entries) {
        if (!e.start || !isAnnualForm(e.form)) continue;
        const d = days(e.start, e.end);
        if (d >= 340 && d <= 385) ends.add(e.end);
      }
    }
    if (ends.size) break;
  }
  return [...ends].sort().slice(-n);
}

export function fiscalLabel(end: string): string {
  return `FY${end.slice(0, 4)}`;
}

/**
 * Trailing twelve months for a duration line: latest fiscal year plus the
 * current year to date, minus the same span a year earlier. Null when the
 * quarter values are not all there; never a guess.
 */
export function pickTtm(
  cf: CompanyFacts,
  tags: string[],
  lastFyEnd: string,
  fyValue: number | null
): { value: number; asOf: string; entry: FactEntry; concept: string } | null {
  if (fyValue == null) return null;
  for (const tag of tags) {
    for (const { concept, entries } of entriesFor(cf, tag)) {
      // Year to date entries after the last fiscal year end.
      const ytd = entries.filter(
        (e) => e.start && e.end > lastFyEnd && days(lastFyEnd, e.start) >= 0 && days(lastFyEnd, e.start) <= 4
      );
      if (ytd.length === 0) continue;
      const latest = ytd.reduce((a, b) => (b.end > a.end ? b : a));
      const span = days(latest.start as string, latest.end);
      const prior = entries.filter(
        (e) =>
          e.start &&
          Math.abs(days(e.end, latest.end) - 365) <= 10 &&
          Math.abs(days(e.start, e.end) - span) <= 10
      );
      if (prior.length === 0) continue;
      const priorBest = prior.reduce((a, b) => (b.filed > a.filed ? b : a));
      return { value: fyValue + latest.val - priorBest.val, asOf: latest.end, entry: latest, concept };
    }
  }
  return null;
}

/** Latest balance on or after the last fiscal year end (the newest quarter). */
export function pickLatestInstant(cf: CompanyFacts, tags: string[], lastFyEnd: string): Picked | null {
  let best: Picked | null = null;
  for (const tag of tags) {
    for (const { concept, entries } of entriesFor(cf, tag)) {
      for (const e of entries) {
        if (e.start || e.end < lastFyEnd) continue;
        if (!best || e.end > best.entry.end || (e.end === best.entry.end && e.filed > best.entry.filed)) {
          best = { value: e.val, entry: e, concept };
        }
      }
    }
    if (best) return best;
  }
  return best;
}

export function sourceFor(cik: string, e: FactEntry, concept: string, statement: string): Source {
  return {
    form: e.form,
    filed: e.filed,
    accession: e.accn,
    url: filingIndexUrl(cik, e.accn),
    fy: e.fy,
    period: e.end,
    statement,
    concept,
  };
}

/* ---------------------------------------------------------- statements */

export interface BuiltStatements {
  financials: Financials;
  /** lineKey → column values, for the metrics step. */
  get: (statement: "income" | "balance" | "cashflow", key: string, column: number) => number | null;
  columns: number;
  lastFyEnd: string;
  ttmColumn: number | null;
  facts: Fact[];
}

export function buildStatements(cf: CompanyFacts, cik: string, currency: string): BuiltStatements | null {
  const ends = fiscalYearEnds(cf, 5);
  if (ends.length === 0) return null;
  const lastFyEnd = ends[ends.length - 1];
  const years = ends.map(fiscalLabel);
  const facts: Fact[] = [];

  const build = (specs: LineSpec[], statement: "income" | "balance" | "cashflow", label: string) => {
    const lines: StatementLine[] = [];
    let ttmPossible = false;
    for (const spec of specs) {
      if (spec.tags.length === 0) {
        lines.push({ key: spec.key, label: spec.label, values: [], sources: [], keyLine: spec.keyLine, yoy: [], unit: spec.unit });
        continue;
      }
      const values: (number | null)[] = [];
      const sources: (Source | null)[] = [];
      for (const end of ends) {
        const p = pickAnnual(cf, spec.tags, spec.kind, end);
        values.push(p ? p.value : null);
        sources.push(p ? sourceFor(cik, p.entry, p.concept, label) : null);
      }
      // TTM column
      if (spec.kind === "duration") {
        const t = pickTtm(cf, spec.tags, lastFyEnd, values[values.length - 1]);
        values.push(t ? t.value : null);
        sources.push(t ? { ...sourceFor(cik, t.entry, t.concept, label), period: t.asOf, statement: `${label} (trailing twelve months)` } : null);
        if (t) ttmPossible = true;
      } else {
        const t = pickLatestInstant(cf, spec.tags, lastFyEnd);
        const isNewer = t && t.entry.end > lastFyEnd;
        values.push(isNewer ? t.value : null);
        sources.push(isNewer ? sourceFor(cik, t.entry, t.concept, label) : null);
        if (isNewer) ttmPossible = true;
      }
      lines.push({ key: spec.key, label: spec.label, values, sources, keyLine: spec.keyLine, yoy: [], unit: spec.unit });
    }
    return { lines, ttmPossible };
  };

  const inc = build(INCOME_LINES, "income", "Income statement");
  const bal = build(BALANCE_LINES, "balance", "Balance sheet");
  const cfs = build(CASHFLOW_LINES, "cashflow", "Cash flow statement");
  const columns = ends.length + 1;

  const find = (lines: StatementLine[], key: string) => lines.find((l) => l.key === key);

  // Derived lines: gross profit when not tagged, free cash flow always.
  const gp = find(inc.lines, "grossProfit");
  const rev = find(inc.lines, "revenue");
  const cor = find(inc.lines, "costOfRevenue");
  if (gp && rev && cor) {
    for (let i = 0; i < columns; i++) {
      if (gp.values[i] == null && rev.values[i] != null && cor.values[i] != null) {
        gp.values[i] = (rev.values[i] as number) - (cor.values[i] as number);
        gp.sources[i] = rev.sources[i] ? { ...(rev.sources[i] as Source), statement: "Income statement (revenue minus cost of revenue)" } : null;
      }
    }
  }
  const fcf = find(cfs.lines, "fcf");
  const cfo = find(cfs.lines, "cfo");
  const capex = find(cfs.lines, "capex");
  if (fcf && cfo && capex) {
    fcf.values = [];
    fcf.sources = [];
    for (let i = 0; i < columns; i++) {
      if (cfo.values[i] != null && capex.values[i] != null) {
        fcf.values.push((cfo.values[i] as number) - Math.abs(capex.values[i] as number));
        fcf.sources.push(cfo.sources[i] ? { ...(cfo.sources[i] as Source), statement: "Cash flow statement (operations minus capital expenditures)" } : null);
      } else {
        fcf.values.push(null);
        fcf.sources.push(null);
      }
    }
  }

  // Year over year, and drop lines with no data at all.
  const finish = (lines: StatementLine[]) =>
    lines
      .filter((l) => l.values.some((v) => v != null))
      .map((l) => ({
        ...l,
        yoy: l.values.map((v, i) => {
          if (i === 0 || i >= ends.length) return null;
          const prev = l.values[i - 1];
          if (v == null || prev == null || prev === 0) return null;
          return Number((((v - prev) / Math.abs(prev)) * 100).toFixed(1));
        }),
      }));

  const income = finish(inc.lines);
  const balance = finish(bal.lines);
  const cashflow = finish(cfs.lines);
  const ttmColumn = inc.ttmPossible || bal.ttmPossible || cfs.ttmPossible ? ends.length : null;
  const colLabels = [...years, "TTM"];

  // Facts for every key line and column, ids like revenue.FY2025 / revenue.TTM.
  const register = (lines: StatementLine[]) => {
    for (const l of lines) {
      l.values.forEach((v, i) => {
        if (v == null || !l.sources[i]) return;
        facts.push({
          id: `${l.key}.${colLabels[i]}`,
          label: `${l.label}, ${colLabels[i]}`,
          value: v,
          unit: l.unit,
          display: displayValue(v, l.unit, currency),
          source: l.sources[i] as Source,
        });
      });
    }
  };
  register(income);
  register(balance);
  register(cashflow);

  const latest = [...income, ...balance, ...cashflow]
    .flatMap((l) => l.sources)
    .filter((s): s is Source => !!s)
    .reduce((a, b) => (b.filed > a.filed ? b : a));

  const opInc = find(income, "operatingIncome");
  const ni = find(income, "netIncome");
  const bars = colLabels.map((year, i) => ({
    year,
    revenue: rev?.values[i] ?? null,
    operatingIncome: opInc?.values[i] ?? null,
    netIncome: ni?.values[i] ?? null,
    fcf: fcf?.values[i] ?? null,
  }));

  const getter = (statement: "income" | "balance" | "cashflow", key: string, column: number) => {
    const lines = statement === "income" ? income : statement === "balance" ? balance : cashflow;
    return find(lines, key)?.values[column] ?? null;
  };

  return {
    financials: {
      currency,
      years: colLabels,
      periodEnds: [...ends, ""],
      income,
      balance,
      cashflow,
      asOf: latest.filed,
      latestFiling: latest,
      bars,
    },
    get: getter,
    columns,
    lastFyEnd,
    ttmColumn,
    facts,
  };
}

export { displayValue } from "../../lib/format.ts";
