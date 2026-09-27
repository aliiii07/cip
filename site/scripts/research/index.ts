/**
 * Builds the research file for one company or all fifty.
 *
 *   npm run research AAPL          one company
 *   npm run research all           every company in lib/nasdaq50.ts
 *   npm run research check         which cached files have a newer filing
 *   npm run research AAPL --table  also print 15 numbers with their filing values
 *
 * Order is the honesty guarantee: fetch, compute every number in code,
 * write words from those numbers only, check every sentence, save.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { NASDAQ_50, COMPANY, type Sector } from "../../lib/nasdaq50.ts";
import { annualisedVolPct, beta, bootstrapHorizon, dailyReturns, maxDrawdownPct } from "../../lib/bootstrap.ts";
import {
  HEALTH_RULE,
  RISK_RULES,
  TRACK_RULE,
  businessRiskLevel,
  financialRiskLevel,
  healthVerdict,
  legalRiskLevel,
  marketRiskLevel,
  trackRecordVerdict,
} from "../../lib/verdicts.ts";
import { yahooChart, yahooQuotes, yahooSummary } from "../../lib/yahoo.ts";
import type {
  AuditView,
  CompanyResearch,
  Fact,
  QuickBlock,
  ResearchEvent,
  RiskView,
  SegmentSeries,
  Sentence,
  Source,
} from "../../lib/research-types.ts";

import {
  ANNUAL_FORMS,
  cikFor,
  companyFacts,
  filingDocUrl,
  filingFiles,
  filingIndexUrl,
  htmlToText,
  listFilings,
  memberLabel,
  parseInstance,
  parseLabels,
  secText,
  submissions,
  type CompanyFacts,
  type Filing,
} from "./edgar.ts";
import { displayValue } from "../../lib/format.ts";
import { MATURITY_TAGS, buildStatements, entriesFor } from "./facts.ts";
import {
  balanceSheetView,
  cashAndInvestments,
  computeRatios,
  earningsQuality,
  ebitda,
  ratioRows,
  snapshot,
  totalDebt,
} from "./metrics.ts";
import { extractSections, readAudit, readLegal } from "./text.ts";
import { checkSentence, wordCount, yearsFrom } from "./verify.ts";
import {
  SECTIONS,
  rewriteSentence,
  writeFallback,
  writeWithClaude,
  type ComingCandidate,
  type MomentCandidate,
  type WriterInput,
  type WriterOutput,
} from "./write.ts";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..", "..");
const OUT_DIR = path.join(ROOT, "data", "companies");
const ENV_PATH = path.join(ROOT, ".env");

// site/.env holds the keys; load it the way the app would, without a dependency.
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const HORIZONS = [
  { key: "1m", label: "1 month", days: 21 },
  { key: "3m", label: "3 months", days: 63 },
  { key: "1y", label: "1 year", days: 252 },
];

const factsCache = new Map<string, CompanyFacts>();
async function cachedFacts(cik: string): Promise<CompanyFacts> {
  const hit = factsCache.get(cik);
  if (hit) return hit;
  const cf = await companyFacts(cik);
  factsCache.set(cik, cf);
  return cf;
}

const today = () => new Date().toISOString().slice(0, 10);
const iso = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

function detectCurrency(cf: CompanyFacts): string {
  const counts = new Map<string, number>();
  for (const tag of ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "Revenue"]) {
    for (const tax of ["us-gaap", "ifrs-full"]) {
      const node = cf.facts[tax]?.[tag];
      if (!node) continue;
      for (const [unit, entries] of Object.entries(node.units)) counts.set(unit, (counts.get(unit) ?? 0) + entries.length);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0].toUpperCase() : "USD";
}

/* ------------------------------------------------------------ segments */

async function readSegments(
  cik: string,
  annuals: Filing[],
  currency: string
): Promise<{ business: SegmentSeries[]; geographic: SegmentSeries[]; products: SegmentSeries[]; topCustomerPct: number | null }> {
  type Row = { axis: string; member: string; label: string; end: string; concept: string; value: number; source: Source };
  const rows: Row[] = [];
  let topCustomerPct: number | null = null;
  const REVENUE = /^(us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax|us-gaap:Revenues|us-gaap:SalesRevenueNet|ifrs-full:Revenue)$/;
  const OPINC = /^(us-gaap:OperatingIncomeLoss|ifrs-full:ProfitLossFromOperatingActivities)$/;
  const AXES: Record<string, string> = {
    "srt:ProductOrServiceAxis": "products",
    "us-gaap:StatementBusinessSegmentsAxis": "business",
    "srt:StatementGeographicalAxis": "geographic",
  };

  for (const f of annuals.slice(0, 2)) {
    let files: string[] = [];
    try {
      files = await filingFiles(cik, f.accession);
    } catch {
      continue;
    }
    const inst = files.find((x) => /_htm\.xml$/i.test(x));
    const lab = files.find((x) => /_lab\.xml$/i.test(x));
    if (!inst) continue;
    const xml = await secText(filingDocUrl(cik, f.accession, inst));
    const labels = lab ? parseLabels(await secText(filingDocUrl(cik, f.accession, lab))) : new Map<string, string>();
    const { contexts, facts } = parseInstance(xml);
    const source: Source = { form: f.form, filed: f.filed, accession: f.accession, url: filingIndexUrl(cik, f.accession), fy: Number(f.reportDate.slice(0, 4)), statement: "Segment note (XBRL)" };

    for (const x of facts) {
      const ctx = contexts.get(x.contextRef);
      if (!ctx || !ctx.start) continue;
      const span = (Date.parse(ctx.end) - Date.parse(ctx.start)) / 86400000;
      if (span < 340 || span > 385) continue;
      const dims = ctx.dims.filter((d) => !(d.axis === "srt:ConsolidationItemsAxis" && /OperatingSegmentsMember$/.test(d.member)));
      if (dims.length !== 1) continue;
      const kind = AXES[dims[0].axis];
      const isRev = REVENUE.test(x.concept);
      const isOp = OPINC.test(x.concept);
      if (!kind || (!isRev && !isOp)) continue;
      const v = Number(x.value);
      if (!Number.isFinite(v)) continue;
      rows.push({ axis: kind, member: dims[0].member, label: memberLabel(dims[0].member, labels), end: ctx.end, concept: x.concept, value: v, source });
    }

    // Customer concentration, from the same instance.
    for (const x of facts) {
      if (!/ConcentrationRiskPercentage1$/.test(x.concept)) continue;
      const ctx = contexts.get(x.contextRef);
      if (!ctx) continue;
      const isCustomer = ctx.dims.some((d) => /CustomerConcentrationRiskMember$/.test(d.member));
      const isRevenue = ctx.dims.some((d) => /(RevenueFromContractWithCustomerMember|SalesRevenueNetMember|RevenueBenchmarkMember)$/.test(d.member));
      if (!isCustomer || !isRevenue) continue;
      const v = Number(x.value) * 100;
      if (Number.isFinite(v)) topCustomerPct = Math.max(topCustomerPct ?? 0, v);
    }
  }

  const series = (kind: string, concept: RegExp, measure: "Revenue" | "Operating income"): SegmentSeries[] => {
    const sel = rows.filter((r) => r.axis === kind && concept.test(r.concept));
    if (sel.length === 0) return [];
    // Latest filing wins per (member, end).
    const byKey = new Map<string, Row>();
    for (const r of sel) {
      const k = `${r.member}|${r.end}`;
      const cur = byKey.get(k);
      if (!cur || r.source.filed > cur.source.filed) byKey.set(k, r);
    }
    const ends = [...new Set([...byKey.values()].map((r) => r.end))].sort().slice(-5);
    const members = [...new Set([...byKey.values()].map((r) => r.member))];
    // Drop an aggregate "Product" member when finer product lines exist.
    const fine = members.filter((m) => !/^us-gaap:ProductMember$/.test(m));
    const useMembers = kind === "products" && fine.length >= 3 ? fine : members;
    const latestEnd = ends[ends.length - 1];
    const items = useMembers
      .map((m) => ({
        name: byKey.get(`${m}|${latestEnd}`)?.label ?? [...byKey.values()].find((r) => r.member === m)?.label ?? m,
        values: ends.map((e) => byKey.get(`${m}|${e}`)?.value ?? null),
      }))
      .filter((it) => it.values.some((v) => v != null))
      .sort((a, b) => (b.values[b.values.length - 1] ?? 0) - (a.values[a.values.length - 1] ?? 0));
    const src = [...byKey.values()].reduce((a, b) => (b.source.filed > a.source.filed ? b : a)).source;
    const axisLabel = kind === "products" ? "Product" : kind === "business" ? "Business segment" : "Region";
    return [{ axis: axisLabel, measure, years: ends.map((e) => `FY${e.slice(0, 4)}`), items, source: src }];
  };

  return {
    business: [...series("business", REVENUE, "Revenue"), ...series("business", OPINC, "Operating income")],
    geographic: [...series("geographic", REVENUE, "Revenue"), ...series("geographic", OPINC, "Operating income")],
    products: series("products", REVENUE, "Revenue"),
    topCustomerPct,
  };
}

/* ---------------------------------------------------------------- run */

interface PriceData {
  closes: number[];
  dates: string[];
  returns: number[];
  vol: number;
  maxDd: number;
  betaVsSpx: number | null;
  firstTradeYear: number | null;
  asOf: string;
  moves: { date: string; pct: number }[];
}

async function prices(ticker: string): Promise<PriceData> {
  const { bars, meta } = await yahooChart(ticker, { interval: "1d", range: "5y" });
  const closes = bars.map((b) => b.close);
  const dates = bars.map((b) => iso(b.time));
  const returns = dailyReturns(closes);
  const byDay = new Map<number, number>();
  for (let i = 1; i < bars.length; i++) byDay.set(Math.floor(bars[i].time / 86400), Math.log(bars[i].close / bars[i - 1].close));
  let betaVsSpx: number | null = null;
  try {
    const spx = await yahooChart("^GSPC", { interval: "1d", range: "5y" });
    const bench = new Map<number, number>();
    for (let i = 1; i < spx.bars.length; i++) bench.set(Math.floor(spx.bars[i].time / 86400), Math.log(spx.bars[i].close / spx.bars[i - 1].close));
    betaVsSpx = beta(byDay, bench);
  } catch {
    betaVsSpx = null;
  }
  const moves: { date: string; pct: number }[] = [];
  for (let i = 1; i < bars.length; i++) {
    moves.push({ date: dates[i], pct: Number((((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100).toFixed(2)) });
  }
  return {
    closes,
    dates,
    returns,
    vol: annualisedVolPct(returns),
    maxDd: maxDrawdownPct(closes),
    betaVsSpx,
    firstTradeYear: meta.firstTradeDate ? Number(iso(meta.firstTradeDate).slice(0, 4)) : null,
    asOf: iso(meta.regularMarketTime),
    moves,
  };
}

async function research(ticker: string, opts: { table: boolean }): Promise<CompanyResearch> {
  const company = COMPANY[ticker];
  if (!company) throw new Error(`${ticker} is not in the NASDAQ 50 list`);
  const log = (msg: string) => console.log(`[${ticker}] ${msg}`);

  // ---- fetch -------------------------------------------------------------
  log("fetching SEC index and facts");
  const { cik } = await cikFor(ticker);
  const subs = await submissions(cik);
  const filings = listFilings(subs);
  const annuals = filings.filter((f) => ANNUAL_FORMS.includes(f.form));
  if (annuals.length === 0) throw new Error(`${ticker}: no annual report on EDGAR`);
  const latestAnnual = annuals[0];
  const periodic = filings.filter((f) => [...ANNUAL_FORMS, "10-Q"].includes(f.form));
  const latestFiling = periodic[0];
  const cf = await cachedFacts(cik);
  const currency = detectCurrency(cf);
  const form = latestAnnual.form;

  log("fetching prices, quotes and calendar");
  const px = await prices(ticker);
  const sectorTickers = NASDAQ_50.filter((c) => c.sector === company.sector).map((c) => c.symbol);
  const quotes = await yahooQuotes([...new Set([ticker, ...sectorTickers])]);
  const own = quotes.find((q) => q.symbol === ticker);
  const summary = await yahooSummary(ticker).catch(() => ({}) as Awaited<ReturnType<typeof yahooSummary>>);

  // ---- statements --------------------------------------------------------
  log("building statements");
  const built = buildStatements(cf, cik, currency);
  const facts: Fact[] = [];
  const sectionsMissing: string[] = [];
  if (!built) sectionsMissing.push("Financials", "Ratios and peers", "Earnings quality", "Balance sheet");
  else facts.push(...built.facts);

  const latestAnnualSource: Source = {
    form: latestAnnual.form,
    filed: latestAnnual.filed,
    accession: latestAnnual.accession,
    url: filingIndexUrl(cik, latestAnnual.accession),
    fy: Number(latestAnnual.reportDate.slice(0, 4)),
    period: latestAnnual.reportDate,
  };
  const latestFilingSource: Source = {
    form: latestFiling.form,
    filed: latestFiling.filed,
    accession: latestFiling.accession,
    url: filingIndexUrl(cik, latestFiling.accession),
    period: latestFiling.reportDate,
  };
  const priceSource = (asOf: string): Source => ({ form: "Yahoo Finance", filed: asOf, url: `https://finance.yahoo.com/quote/${ticker}/history/` });
  const computed = (from: Source | null, note: string): Source => ({ ...(from ?? latestAnnualSource), statement: note });

  // ---- metrics -----------------------------------------------------------
  const s = built ? snapshot(built) : null;
  const price = own?.regularMarketPrice ?? null;
  const marketCap = own?.marketCap ?? null;
  const prevCol = built ? built.columns - 3 : -1;
  const ratios = built && s
    ? computeRatios({ s, price, marketCap, prevEquity: prevCol >= 0 ? built.get("balance", "equity", prevCol) : null, prevAssets: prevCol >= 0 ? built.get("balance", "totalAssets", prevCol) : null })
    : null;
  if (ratios && s) {
    for (const [k, v] of Object.entries(ratios)) {
      if (v == null) continue;
      const spec = (await import("./metrics.ts")).RATIO_SPECS.find((r) => r.key === k);
      facts.push({ id: `ratio.${k}`, label: spec?.label ?? k, value: v, unit: spec?.unit ?? "x", display: spec?.unit === "pct" ? displayValue(v, "pct") : `${v.toFixed(spec?.key === "pe" || spec?.key === "evToEbitda" ? 1 : 2)}x`, source: computed(s.incomeSource, `Computed: ${spec?.definition ?? k}`) });
    }
  }

  // Peers: the largest same sector companies by market cap, up to 4.
  log("computing peer ratios");
  const peerRows: { ticker: string; name: string; values: Record<string, number | null> }[] = [];
  const peerCandidates = quotes
    .filter((q) => q.symbol !== ticker && q.marketCap != null)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 4);
  for (const p of peerCandidates) {
    try {
      const pc = await cikFor(p.symbol);
      const pcf = await cachedFacts(pc.cik);
      const pb = buildStatements(pcf, pc.cik, detectCurrency(pcf));
      if (!pb) continue;
      const ps = snapshot(pb);
      const pPrev = pb.columns - 3;
      peerRows.push({
        ticker: p.symbol,
        name: COMPANY[p.symbol]?.name ?? p.symbol,
        values: computeRatios({ s: ps, price: p.regularMarketPrice ?? null, marketCap: p.marketCap ?? null, prevEquity: pPrev >= 0 ? pb.get("balance", "equity", pPrev) : null, prevAssets: pPrev >= 0 ? pb.get("balance", "totalAssets", pPrev) : null }),
      });
    } catch (err) {
      log(`peer ${p.symbol} skipped: ${String(err).slice(0, 80)}`);
    }
  }
  if (peerRows.length) {
    facts.push({ id: "ratios.peerCount", label: "Peers compared", value: peerRows.length, unit: "count", display: String(peerRows.length), source: computed(null, "Peers: the largest companies in the same sector among the NASDAQ 50") });
  }

  // ---- segments ----------------------------------------------------------
  log("reading segment notes");
  const seg = await readSegments(cik, annuals, currency);
  const revenueSources: CompanyResearch["revenueSources"] = [];
  const revSeries = seg.products[0] ?? seg.business.find((x) => x.measure === "Revenue") ?? null;
  if (revSeries && s?.revenue != null && built) {
    const lastIdx = revSeries.years.length - 1;
    const fyRevenue = built.get("income", "revenue", built.columns - 2);
    const yearLabel = revSeries.years[lastIdx];
    for (const it of revSeries.items) {
      const v = it.values[lastIdx];
      if (v == null || !fyRevenue) continue;
      const pct = Number(((v / fyRevenue) * 100).toFixed(1));
      const id = `segment.${it.name.replace(/\W+/g, "")}.${yearLabel}`;
      facts.push({ id, label: `${it.name} share of revenue, ${yearLabel}`, value: pct, unit: "pct", display: displayValue(pct, "pct"), source: { ...revSeries.source, period: yearLabel } });
      facts.push({ id: `${id}.value`, label: `${it.name} revenue, ${yearLabel}`, value: v, unit: "USD", display: displayValue(v, "USD", currency), source: { ...revSeries.source, period: yearLabel } });
      revenueSources.push({ name: it.name, pct, value: v, factId: id });
    }
    revenueSources.sort((a, b) => b.pct - a.pct);
  }
  if (!revSeries) sectionsMissing.push("Segments");

  // ---- filing text -------------------------------------------------------
  log("reading the annual report text");
  const html = await secText(filingDocUrl(cik, latestAnnual.accession, latestAnnual.primaryDocument));
  const text = htmlToText(html);
  const sections = extractSections(text, form);
  const auditRead = readAudit(sections);
  const legalRead = readLegal(sections.legal);
  const annualUrl = filingDocUrl(cik, latestAnnual.accession, latestAnnual.primaryDocument);

  // ---- simulation --------------------------------------------------------
  log("running 5,000 path bootstraps");
  const horizons = HORIZONS.map((h) => bootstrapHorizon(px.returns, { key: h.key, label: h.label, days: h.days, seedKey: `${ticker}:${px.asOf}` }));
  // Indicator settings the chart section names.
  facts.push({ id: "chart.ma20", label: "Short moving average, days", value: 20, unit: "count", display: "20", source: priceSource(px.asOf) });
  facts.push({ id: "chart.ma50", label: "Long moving average, days", value: 50, unit: "count", display: "50", source: priceSource(px.asOf) });
  facts.push({ id: "chart.rsi", label: "RSI period, days", value: 14, unit: "count", display: "14", source: priceSource(px.asOf) });
  facts.push({ id: "sim.paths", label: "Simulation paths per horizon", value: 5000, unit: "count", display: "5,000", source: priceSource(px.asOf) });
  facts.push({ id: "sim.days", label: "Trading days of history used", value: px.returns.length, unit: "count", display: `${px.returns.length} trading days`, source: priceSource(px.asOf) });
  for (const h of horizons) {
    const st = h.stats;
    facts.push({ id: `sim.${h.key}.pEndHigher`, label: `Chance of ending higher, ${h.label}`, value: Number((st.pEndHigher * 100).toFixed(1)), unit: "pct", display: displayValue(st.pEndHigher * 100, "pct"), source: priceSource(px.asOf) });
    facts.push({ id: `sim.${h.key}.median`, label: `Median outcome, ${h.label}`, value: st.medianPct, unit: "pct", display: displayValue(st.medianPct, "pct"), source: priceSource(px.asOf) });
    facts.push({ id: `sim.${h.key}.pDrop20`, label: `Chance of a 20% or larger drop, ${h.label}`, value: Number((st.pDrop20 * 100).toFixed(1)), unit: "pct", display: displayValue(st.pDrop20 * 100, "pct"), source: priceSource(px.asOf) });
  }

  // ---- verdict inputs ----------------------------------------------------
  const cashInv = s ? cashAndInvestments(s) : null;
  const debt = s ? totalDebt(s) : null;
  const eb = s ? ebitda(s) : null;
  const netCash = cashInv != null && debt != null && cashInv >= debt;
  const netDebtToEbitda = ratios?.netDebtToEbitda ?? null;
  const fcfLast3 = built ? [2, 1, 0].map((k) => built.get("cashflow", "fcf", built.columns - 2 - k)).reverse() : [];
  const health = healthVerdict({ netDebtToEbitda, netCash, hasDebt: (debt ?? 0) > 0, interestCoverage: ratios?.interestCoverage ?? null, fcfLast3, currentRatio: ratios?.currentRatio ?? null });

  const fyCols = built ? built.columns - 1 : 0;
  const revFirst = built ? built.get("income", "revenue", 0) : null;
  const revLast = built ? built.get("income", "revenue", fyCols - 1) : null;
  const cagr = revFirst && revLast && fyCols > 1 ? Number((((revLast / revFirst) ** (1 / (fyCols - 1)) - 1) * 100).toFixed(1)) : null;
  const profitableYears = built ? Array.from({ length: fyCols }, (_, i) => built.get("income", "netIncome", i)).filter((v) => v != null && v > 0).length : 0;
  const trackChip = trackRecordVerdict({ revenueCagr5yPct: cagr, profitableYears, yearsCounted: fyCols });

  const bs = s?.balanceSource ?? null;
  const mk = (id: string, label: string, value: number | null, unit: Fact["unit"], src: Source | null, note: string, display?: string): Fact | null => {
    if (value == null || !src) return null;
    const f: Fact = { id, label, value, unit, display: display ?? displayValue(value, unit, currency), source: { ...src, statement: note } };
    facts.push(f);
    return f;
  };
  const healthFacts = {
    cashAndInvestments: mk("health.cashAndInvestments", "Cash and investments", cashInv, "USD", bs, "Balance sheet (cash plus short and long term investments)"),
    totalDebt: mk("health.totalDebt", "Total debt", debt, "USD", bs, "Balance sheet (short plus long term debt)"),
    fcf: mk("health.fcf", "Free cash flow, latest twelve months", s?.fcf ?? null, "USD", s?.cashflowSource ?? null, "Cash flow statement (operations minus capital expenditures)"),
    interestCoverage: mk("health.interestCoverage", "Interest coverage", ratios?.interestCoverage ?? null, "x", s?.incomeSource ?? null, "Computed: operating income over interest expense"),
    netDebtToEbitda: mk("health.netDebtToEbitda", "Net debt to EBITDA", netDebtToEbitda, "x", bs, "Computed: debt minus cash and investments, over EBITDA"),
    currentRatio: mk("health.currentRatio", "Current ratio", ratios?.currentRatio ?? null, "x", bs, "Computed: current assets over current liabilities"),
  };
  const trackFacts = {
    founded: mk("track.founded", "Founded or incorporated", sections.foundedYear, "years", latestAnnualSource, "Item 1, Business", sections.foundedYear ? String(sections.foundedYear) : undefined),
    tradingSince: mk("track.tradingSince", "Shares trading since", px.firstTradeYear, "years", priceSource(px.asOf), "First bar of the price history", px.firstTradeYear ? String(px.firstTradeYear) : undefined),
    yearsPublic: mk("track.yearsPublic", "Years public", px.firstTradeYear ? new Date().getFullYear() - px.firstTradeYear : null, "years", priceSource(px.asOf), "Years since the first bar of the price history"),
    revenueCagr5y: mk("track.revenueCagr", `Revenue growth per year, ${built?.financials.years[0]} to ${built?.financials.years[fyCols - 1]}`, cagr, "pct", s?.incomeSource ?? null, "Computed: compound annual growth of revenue"),
    profitableYears: mk("track.profitableYears", "Profitable years of the last five", profitableYears, "count", s?.incomeSource ?? null, "Net income above zero", String(profitableYears)),
    yearsCounted: mk("track.yearsCounted", "Fiscal years counted", fyCols, "years", s?.incomeSource ?? null, "Fiscal years with a filed income statement", `${fyCols} years`),
  };

  // Earnings quality, balance sheet.
  const eq = built && s ? earningsQuality(built, s) : null;
  if (eq) {
    facts.push(...eq.facts);
    const pass = eq.checks.filter((c) => c.mark === "Pass").length;
    facts.push({ id: "eq.passCount", label: "Earnings quality checks passed", value: pass, unit: "count", display: String(pass), source: computed(s?.incomeSource ?? null, "Count of checks marked Pass") });
    facts.push({ id: "eq.total", label: "Earnings quality checks", value: eq.checks.length, unit: "count", display: String(eq.checks.length), source: computed(s?.incomeSource ?? null, "Number of checks") });
  }
  const maturities: { label: string; value: number; source: Source }[] = [];
  for (const m of MATURITY_TAGS) {
    for (const { concept, entries } of entriesFor(cf, m.tag)) {
      const latest = entries.filter((e) => !e.start).sort((a, b) => (b.end + b.filed).localeCompare(a.end + a.filed))[0];
      if (latest) {
        maturities.push({ label: m.label, value: latest.val, source: { form: latest.form, filed: latest.filed, accession: latest.accn, url: filingIndexUrl(cik, latest.accn), fy: latest.fy, period: latest.end, statement: "Debt note", concept } });
        break;
      }
    }
  }
  let purchaseObligations: Fact | null = null;
  for (const { concept, entries } of entriesFor(cf, "UnrecordedUnconditionalPurchaseObligationBalanceSheetAmount")) {
    const latest = entries.filter((e) => !e.start).sort((a, b) => (b.end + b.filed).localeCompare(a.end + a.filed))[0];
    if (latest) {
      purchaseObligations = mk("bs.purchaseObligations", "Unconditional purchase obligations", latest.val, "USD", { form: latest.form, filed: latest.filed, accession: latest.accn, url: filingIndexUrl(cik, latest.accn), fy: latest.fy, period: latest.end, concept }, "Commitments note");
      break;
    }
  }
  const bsView = built && s ? balanceSheetView(built, s, maturities, purchaseObligations) : null;
  if (bsView) facts.push(...bsView.facts);

  // Risk.
  const volFact = mk("risk.vol", "Annualised volatility, 5 years", px.vol, "pct", priceSource(px.asOf), "Standard deviation of daily returns, annualised");
  const ddFact = mk("risk.maxDrawdown", "Largest fall from a peak, 5 years", px.maxDd, "pct", priceSource(px.asOf), "Peak to trough of daily closes");
  const betaFact = mk("risk.beta", "Beta versus the S&P 500, 5 years", px.betaVsSpx, "x", priceSource(px.asOf), "Slope of daily returns on the index", px.betaVsSpx != null ? px.betaVsSpx.toFixed(2) : undefined);
  const geoRev = seg.geographic.find((x) => x.measure === "Revenue");
  let topRegionPct: number | null = null;
  if (geoRev && revLast) {
    const last = geoRev.items.map((it) => it.values[it.values.length - 1] ?? 0);
    const total = last.reduce((a, b) => a + b, 0);
    if (total > 0) topRegionPct = Number(((Math.max(...last) / total) * 100).toFixed(1));
  }
  const riskView: RiskView = {
    scorecard: [
      { key: "market", label: "Market risk", level: marketRiskLevel({ volPct: px.vol, maxDrawdownPct: px.maxDd }), rule: RISK_RULES.market, inputs: `Volatility ${displayValue(px.vol, "pct")}, largest fall ${displayValue(px.maxDd, "pct")}${px.betaVsSpx != null ? `, beta ${px.betaVsSpx.toFixed(2)}` : ""}` },
      { key: "financial", label: "Financial risk", level: financialRiskLevel({ netDebtToEbitda, netCash, currentRatio: ratios?.currentRatio ?? null }), rule: RISK_RULES.financial, inputs: `${netCash ? "Net cash" : netDebtToEbitda != null ? `Net debt to EBITDA ${netDebtToEbitda.toFixed(2)}x` : "Net debt not computable"}${ratios?.currentRatio != null ? `, current ratio ${ratios.currentRatio.toFixed(2)}` : ""}` },
      { key: "business", label: "Business risk", level: businessRiskLevel({ topCustomerPct: seg.topCustomerPct, topRegionPct }), rule: RISK_RULES.business, inputs: `${seg.topCustomerPct != null ? `Largest customer ${seg.topCustomerPct.toFixed(0)}% of revenue` : "No customer above 10% disclosed"}${topRegionPct != null ? `, largest region ${topRegionPct.toFixed(0)}%` : ""}` },
      { key: "legal", label: "Legal and regulatory risk", level: legalRiskLevel(legalRead), rule: RISK_RULES.legal, inputs: legalRead.materialLanguage ? "A pending matter with a stated amount or possible material loss" : legalRead.namedCases > 0 ? `${legalRead.namedCases} named matters or regulators in the legal section` : "No named matters beyond routine" },
    ],
    factors: [],
    sourceUrl: annualUrl,
  };

  // Audit.
  const eightKs = filings.filter((f) => f.form === "8-K" || f.form === "8-K/A").filter((f) => Date.parse(f.filed) > Date.now() - 5 * 365.25 * 86400000);
  const auditView: AuditView = {
    auditor: auditRead.auditor,
    location: auditRead.location,
    since: auditRead.since,
    yearsAsAuditor: auditRead.since ? new Date().getFullYear() - auditRead.since : null,
    opinion: auditRead.opinion,
    icfrEffective: auditRead.icfrEffective,
    materialWeakness: auditRead.materialWeakness,
    cams: auditRead.cams,
    auditorChanges: eightKs.filter((f) => f.items.split(",").includes("4.01")).map((f) => ({ date: f.filed, url: filingIndexUrl(cik, f.accession) })),
    restatements: eightKs.filter((f) => f.items.split(",").includes("4.02")).map((f) => ({ date: f.filed, url: filingIndexUrl(cik, f.accession) })),
    reportDate: auditRead.reportDate,
    sourceUrl: annualUrl,
  };
  const auditSinceFact = mk("audit.since", "Auditor since", auditRead.since, "years", latestAnnualSource, "Report of Independent Registered Public Accounting Firm", auditRead.since ? String(auditRead.since) : undefined);
  if (!auditRead.auditor) sectionsMissing.push("Audit");

  // Events: the six largest daily moves, each with the nearest 8-K.
  log("locating dated events");
  const sortedMoves = [...px.moves].sort((a, b) => b.pct - a.pct);
  const candidates = [...sortedMoves.slice(0, 3), ...sortedMoves.slice(-3)];
  const moments: MomentCandidate[] = [];
  for (const mv of candidates) {
    const near = filings
      .filter((f) => (f.form === "8-K" || f.form === "8-K/A") && Math.abs(Date.parse(f.filed) - Date.parse(mv.date)) <= 3 * 86400000)
      .sort((a, b) => Math.abs(Date.parse(a.filed) - Date.parse(mv.date)) - Math.abs(Date.parse(b.filed) - Date.parse(mv.date)))[0];
    let excerpt: string | null = null;
    if (near) {
      try {
        const files = await filingFiles(cik, near.accession);
        const ex = files.find((x) => /ex-?99|ex99|press/i.test(x) && /\.htm/i.test(x));
        if (ex) excerpt = htmlToText(await secText(filingDocUrl(cik, near.accession, ex))).slice(0, 1200);
      } catch {
        excerpt = null;
      }
    }
    const factId = `moment.${mv.date}`;
    facts.push({ id: factId, label: `Daily move on ${mv.date}`, value: mv.pct, unit: "pct", display: displayValue(mv.pct, "pct"), source: priceSource(mv.date) });
    moments.push({ date: mv.date, movePct: mv.pct, factId, filingUrl: near ? filingIndexUrl(cik, near.accession) : null, filingForm: near ? near.form : null, filingItems: near ? near.items : null, excerpt });
  }
  const coming: ComingCandidate[] = [];
  const earningsDate = summary.calendarEvents?.earnings?.earningsDate?.[0]?.fmt;
  if (earningsDate) coming.push({ date: earningsDate, kind: "earnings", url: `https://finance.yahoo.com/quote/${ticker}/`, source: "Yahoo Finance calendar" });
  const exDiv = summary.calendarEvents?.exDividendDate?.fmt;
  if (exDiv && Date.parse(exDiv) > Date.now()) coming.push({ date: exDiv, kind: "exDividend", url: `https://finance.yahoo.com/quote/${ticker}/`, source: "Yahoo Finance calendar" });

  // ---- write -------------------------------------------------------------
  log("writing");
  const winput: WriterInput = {
    ticker,
    name: company.name,
    facts,
    chips: { health: { chip: health.chip, tests: health.tests }, track: { chip: trackChip } },
    revenueSources: revenueSources.map((r) => ({ ...r, year: revSeries?.years[revSeries.years.length - 1] ?? "" })),
    ids: {
      tradingSince: trackFacts.tradingSince?.id ?? null,
      yearsPublic: trackFacts.yearsPublic?.id ?? null,
      founded: trackFacts.founded?.id ?? null,
      revenueCagr: trackFacts.revenueCagr5y?.id ?? null,
      profitableYears: trackFacts.profitableYears?.id ?? null,
      yearsCounted: trackFacts.yearsCounted?.id ?? null,
      cashAndInvestments: healthFacts.cashAndInvestments?.id ?? null,
      totalDebt: healthFacts.totalDebt?.id ?? null,
      fcf: healthFacts.fcf?.id ?? null,
      interestCoverage: healthFacts.interestCoverage?.id ?? null,
      netDebtToEbitda: healthFacts.netDebtToEbitda?.id ?? null,
      currentRatio: healthFacts.currentRatio?.id ?? null,
      simPaths: "sim.paths",
      simDays: "sim.days",
      peerCount: peerRows.length ? "ratios.peerCount" : null,
      eqPass: eq ? "eq.passCount" : null,
      eqTotal: eq ? "eq.total" : null,
      auditSince: auditSinceFact?.id ?? null,
      vol: volFact?.id ?? null,
      maxDrawdown: ddFact?.id ?? null,
    },
    moments,
    coming,
    riskHeadings: sections.riskHeadings,
    riskUrl: annualUrl,
    legalExcerpt: legalRead.excerpt,
    legalUrl: annualUrl,
    audit: { auditor: auditRead.auditor, opinion: auditRead.opinion, since: auditRead.since },
    currency,
  };
  const claude = await writeWithClaude(winput);
  const writer: "anthropic" | "fallback" = claude ? "anthropic" : "fallback";
  const model = claude?.model ?? null;
  const out: WriterOutput = claude?.out ?? writeFallback(winput);
  if (!claude) log("no ANTHROPIC_API_KEY: text assembled from facts by fixed templates");

  // ---- verify ------------------------------------------------------------
  log("checking every sentence");
  const knownYears = yearsFrom(facts, [...moments.map((m) => m.date), ...coming.map((c) => c.date), latestAnnual.filed, latestAnnual.reportDate]);
  const dropped: CompanyResearch["meta"]["dropped"] = [];
  const trimmed: CompanyResearch["meta"]["dropped"] = [];
  let rewritten = 0;
  const verbatim = (t: string) => text.includes(t.trim().replace(/\.\.\.$/, ""));
  const pass = async (where: string, s: Sentence, quoted = false): Promise<Sentence | null> => {
    let check = checkSentence(s, facts, knownYears);
    if (!check.ok && quoted && verbatim(s.text) && !/[–—]/.test(s.text)) check = { ok: true, reason: "" };
    if (check.ok) return s;
    if (model) {
      const again = await rewriteSentence(model, winput, s, check.reason);
      if (again) {
        rewritten++;
        const second = checkSentence(again, facts, knownYears);
        if (second.ok) return again;
        dropped.push({ where, text: again.text, reason: second.reason });
        return null;
      }
    }
    dropped.push({ where, text: s.text, reason: check.reason });
    return null;
  };
  const passAll = async (where: string, list: Sentence[], quoted = false) => {
    const kept: Sentence[] = [];
    for (const s of list) {
      const k = await pass(where, s, quoted);
      if (k) kept.push(k);
    }
    return kept;
  };

  const qr = out.quickReview;
  const money = await passAll("Quick review: money", qr.money);
  const track = await passAll("Quick review: track record", qr.track);
  const healthS = await passAll("Quick review: health", qr.health);
  const momentsKept = [] as typeof qr.moments;
  for (const m of qr.moments) {
    const k = await pass("Quick review: big moments", { text: m.text, factIds: m.factIds });
    if (k) momentsKept.push({ ...m, text: k.text, factIds: k.factIds });
  }
  const risksKept = [] as typeof qr.risks;
  for (const r of qr.risks) {
    const k = await pass("Quick review: what can go wrong", { text: r.text, factIds: r.factIds }, true);
    if (k) risksKept.push({ ...r, text: k.text, factIds: k.factIds });
  }
  const comingKept = [] as typeof qr.coming;
  for (const c of qr.coming) {
    const k = await pass("Quick review: what is coming", { text: c.text, factIds: c.factIds });
    if (k) comingKept.push({ ...c, text: k.text, factIds: k.factIds });
  }
  const wtm: Record<string, Sentence> = {};
  for (const key of SECTIONS) {
    const s = out.whatThisMeans[key];
    if (!s) continue;
    const k = await pass(`What this means: ${key}`, s);
    if (k) wtm[key] = k;
  }
  const factors: RiskView["factors"] = [];
  for (const r of out.riskFactors) {
    const k = await pass("Risk factors", { text: r.line, factIds: r.factIds }, true);
    if (k) factors.push({ title: r.title, line: k.text, url: annualUrl });
  }
  riskView.factors = factors;

  // Quick review word budget: 150 across the six blocks.
  const allQr = () => [...money, ...track, ...healthS, ...momentsKept.map((m) => ({ text: m.text, factIds: m.factIds })), ...risksKept, ...comingKept.map((c) => ({ text: c.text, factIds: c.factIds }))];
  while (wordCount(allQr()) > 150) {
    const pools: Sentence[][] = [momentsKept as unknown as Sentence[], risksKept as unknown as Sentence[], comingKept as unknown as Sentence[], money, track, healthS];
    const longest = pools.filter((p) => p.length > 0).sort((a, b) => b.length - a.length)[0];
    if (!longest) break;
    const removed = longest.pop() as Sentence;
    trimmed.push({ where: "Quick review word budget", text: removed.text, reason: "over 150 words" });
  }

  const quickReview: QuickBlock[] = [
    { key: "money", title: "Where the money comes from", sentences: money, bars: revenueSources.slice(0, 5).map((r) => ({ name: r.name, pct: r.pct, factId: r.factId })) },
    { key: "track", title: "Track record", chip: { label: trackChip, tone: trackChip === "Strong" ? "good" : trackChip === "Weak" ? "bad" : "neutral", rule: TRACK_RULE }, sentences: track },
    { key: "health", title: "Financial health", chip: { label: health.chip, tone: health.chip === "Strong" ? "good" : health.chip === "Weak" ? "bad" : "neutral", rule: HEALTH_RULE }, sentences: healthS },
    { key: "moments", title: "Big moments", sentences: [], items: momentsKept.map((m) => ({ date: m.date, text: m.text, url: m.url ?? undefined, kind: m.kind, source: m.url ? "SEC filing" : "Price history" })) },
    { key: "risks", title: "What can go wrong", sentences: [], items: risksKept.map((r) => ({ text: r.text, url: r.url, source: `${form} risk factors` })) },
    { key: "coming", title: "What's coming", sentences: [], items: comingKept.map((c) => ({ date: c.date, text: c.text, url: c.url, source: "Yahoo Finance calendar" })) },
  ];
  const quickReviewWords = wordCount(allQr());

  const events: CompanyResearch["events"] = {
    bigMoments: momentsKept.map((m) => ({ date: m.date, title: m.text, kind: m.kind, url: m.url ?? `https://finance.yahoo.com/quote/${ticker}/history/`, source: m.url ? "SEC filing" : "Price history" })),
    coming: comingKept.map((c) => ({ date: c.date, title: c.text, kind: "neutral" as const, url: c.url, source: "Yahoo Finance calendar" })),
  };

  // Verified means every sentence passed the checker. A sentence cut for the
  // word budget was true, only too long, so it does not count against this.
  const verified = dropped.length === 0;

  const result: CompanyResearch = {
    ticker,
    name: company.name,
    cik,
    exchange: subs.exchanges?.[0] ?? own?.fullExchangeName ?? "Nasdaq",
    country: summary.summaryProfile?.country ?? subs.addresses?.business?.stateOrCountryDescription ?? "",
    currency,
    form,
    fiscalYearEnd: subs.fiscalYearEnd,
    profile: {
      sector: summary.summaryProfile?.sector ?? company.sector,
      industry: summary.summaryProfile?.industry ?? subs.sicDescription ?? null,
      website: summary.summaryProfile?.website ?? null,
      employees: summary.summaryProfile?.fullTimeEmployees ?? null,
    },
    asOf: { research: new Date().toISOString(), latestAnnual: latestAnnualSource, latestFiling: latestFilingSource, prices: px.asOf },
    quickReview,
    whatThisMeans: wtm,
    facts,
    revenueSources,
    track: { chip: trackChip, rule: TRACK_RULE, founded: trackFacts.founded, tradingSince: trackFacts.tradingSince, yearsPublic: trackFacts.yearsPublic, revenueCagr5y: trackFacts.revenueCagr5y, profitableYears: trackFacts.profitableYears, yearsCounted: fyCols },
    health: { chip: health.chip, tests: health.tests, rule: HEALTH_RULE, ...healthFacts },
    financials: built?.financials ?? null,
    ratios: ratios ? { asOf: built?.financials.asOf ?? today(), peers: peerRows.map((p) => ({ ticker: p.ticker, name: p.name })), rows: ratioRows(ratios, peerRows) } : null,
    segments: revSeries ? { business: seg.business, geographic: seg.geographic, products: seg.products, currency } : null,
    earningsQuality: eq ? { checks: eq.checks, asOf: built?.financials.asOf ?? today() } : null,
    balanceSheet: bsView?.view ?? null,
    risk: riskView,
    audit: auditRead.auditor ? auditView : null,
    simulation: { basedOn: { from: px.dates[0], to: px.dates[px.dates.length - 1], days: px.returns.length, source: "Yahoo Finance daily closes" }, horizons },
    events,
    verified,
    sectionsMissing,
    meta: { writer, model, dropped: [...dropped, ...trimmed], rewritten, quickReviewWords },
  };
  if (trimmed.length) log(`${trimmed.length} sentence(s) cut for the 150 word budget`);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${ticker}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 1));
  log(`saved ${path.relative(ROOT, outPath)} (${(JSON.stringify(result).length / 1024).toFixed(0)} KB)`);

  if (opts.table && built) printTable(result);
  return result;
}

/* -------------------------------------------------------------- tables */

function printTable(r: CompanyResearch) {
  const fy = r.financials?.years[r.financials.years.length - 2] ?? "";
  const pick = [
    `revenue.${fy}`, `grossProfit.${fy}`, `operatingIncome.${fy}`, `netIncome.${fy}`, `epsDiluted.${fy}`,
    `cfo.${fy}`, `capex.${fy}`, `fcf.${fy}`, `buybacks.${fy}`, `dividends.${fy}`,
    `totalAssets.${fy}`, `cash.${fy}`, `longTermDebt.${fy}`, `equity.${fy}`, `sharesOutstanding.${fy}`,
  ];
  const rows = pick.map((id) => r.facts.find((f) => f.id === id)).filter((f): f is Fact => !!f).slice(0, 15);
  console.log(`\nFifteen numbers, ${r.ticker}: page value | value in the filing | filing`);
  for (const f of rows) {
    console.log(`  ${f.label.padEnd(44)} ${f.display.padEnd(16)} ${String(f.value).padEnd(16)} ${f.source.form} FY${f.source.fy} ${f.source.url}`);
  }
}

function summaryRow(r: CompanyResearch): string {
  const years = r.financials ? r.financials.years.length - 1 : 0;
  const complete = ["Financials", "Ratios and peers", "Segments", "Earnings quality", "Balance sheet", "Risk", "Audit", "Probabilities"].filter((s) => !r.sectionsMissing.includes(s));
  const failed = r.meta.dropped.filter((d) => d.where !== "Quick review word budget").length;
  return `${r.ticker.padEnd(6)} ${r.form.padEnd(5)} ${String(years).padEnd(5)} ${String(complete.length).padEnd(9)} ${(r.sectionsMissing.join(", ") || "none").padEnd(34)} ${failed}`;
}

async function checkFreshness() {
  if (!existsSync(OUT_DIR)) return console.log("No research files yet.");
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const r = JSON.parse(readFileSync(path.join(OUT_DIR, file), "utf8")) as CompanyResearch;
    const subs = await submissions(r.cik);
    const newest = listFilings(subs).find((f) => [...ANNUAL_FORMS, "10-Q"].includes(f.form));
    const flag = newest && newest.filed > r.asOf.latestFiling.filed ? `NEWER ${newest.form} filed ${newest.filed} (cached ${r.asOf.latestFiling.form} ${r.asOf.latestFiling.filed})` : "current";
    console.log(`${r.ticker.padEnd(6)} ${flag}`);
  }
}

/* ----------------------------------------------------------------- main */

const args = process.argv.slice(2);
const table = args.includes("--table");
const target = args.find((a) => !a.startsWith("--"));

if (!target) {
  console.error("usage: npm run research <TICKER|all|check> [--table]");
  process.exit(1);
}

if (target === "check") {
  await checkFreshness();
} else {
  const tickers = target === "all" ? NASDAQ_50.map((c) => c.symbol) : [target.toUpperCase()];
  const results: CompanyResearch[] = [];
  const failures: { ticker: string; error: string }[] = [];
  for (const t of tickers) {
    try {
      results.push(await research(t, { table }));
    } catch (err) {
      failures.push({ ticker: t, error: String(err) });
      console.error(`[${t}] FAILED: ${String(err)}`);
    }
  }
  console.log("\nTicker Form  Years Sections  Missing                            Dropped");
  for (const r of results) console.log(summaryRow(r));
  for (const f of failures) console.log(`${f.ticker.padEnd(6)} FAILED ${f.error.slice(0, 90)}`);
  const dropped = results.flatMap((r) => r.meta.dropped.map((d) => ({ ticker: r.ticker, ...d })));
  if (dropped.length) {
    console.log("\nDropped by the checker, or cut for the word budget:");
    for (const d of dropped) console.log(`  ${d.ticker} ${d.where}: "${d.text}" (${d.reason})`);
  }
  if (failures.length) process.exit(1);
}
