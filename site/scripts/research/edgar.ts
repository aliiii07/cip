/**
 * SEC EDGAR access: the ticker map, XBRL company facts, the submissions
 * index, filing documents, and parsers for the XBRL instance and label
 * linkbase of a filing (segments and regions live only there).
 *
 * The SEC asks for a descriptive User-Agent and no more than about ten
 * requests a second; every call here goes through one throttle.
 */

const UA = "CIP research corporation@netcip.com";
const MIN_GAP_MS = 130;
let lastAt = 0;

async function throttle() {
  const wait = lastAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastAt = Date.now();
}

export async function sec(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" },
      signal: AbortSignal.timeout(60000),
    });
    if (res.status === 429 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`SEC ${res.status} ${url}`);
    return res;
  }
  throw new Error(`SEC rate limited: ${url}`);
}

export async function secJson<T>(url: string): Promise<T> {
  return (await (await sec(url)).json()) as T;
}

export async function secText(url: string): Promise<string> {
  return (await sec(url)).text();
}

/* ------------------------------------------------------------- tickers */

let tickerMap: Map<string, { cik: string; name: string }> | null = null;

export async function cikFor(ticker: string): Promise<{ cik: string; name: string }> {
  if (!tickerMap) {
    const raw = await secJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
      "https://www.sec.gov/files/company_tickers.json"
    );
    tickerMap = new Map();
    for (const v of Object.values(raw)) {
      tickerMap.set(v.ticker.toUpperCase(), { cik: String(v.cik_str).padStart(10, "0"), name: v.title });
    }
  }
  const hit = tickerMap.get(ticker.toUpperCase());
  if (!hit) throw new Error(`SEC has no CIK for ${ticker}`);
  return hit;
}

/* ------------------------------------------------------- company facts */

export interface FactEntry {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

export interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: Record<string, Record<string, { label?: string; units: Record<string, FactEntry[]> }>>;
}

export function companyFacts(cik: string): Promise<CompanyFacts> {
  return secJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
}

/* --------------------------------------------------------- submissions */

export interface Submissions {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sicDescription: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  addresses?: { business?: { stateOrCountryDescription?: string } };
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      reportDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
      items: string[];
    };
  };
}

export interface Filing {
  form: string;
  filed: string;
  reportDate: string;
  accession: string;
  primaryDocument: string;
  items: string;
}

export function submissions(cik: string): Promise<Submissions> {
  return secJson<Submissions>(`https://data.sec.gov/submissions/CIK${cik}.json`);
}

export function listFilings(subs: Submissions): Filing[] {
  const r = subs.filings.recent;
  return r.form.map((form, i) => ({
    form,
    filed: r.filingDate[i],
    reportDate: r.reportDate[i],
    accession: r.accessionNumber[i],
    primaryDocument: r.primaryDocument[i],
    items: r.items[i] ?? "",
  }));
}

export const ANNUAL_FORMS = ["10-K", "20-F", "40-F"];

export function accessionPath(accession: string): string {
  return accession.replace(/-/g, "");
}

export function filingIndexUrl(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath(accession)}/${accession}-index.htm`;
}

export function filingDocUrl(cik: string, accession: string, doc: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath(accession)}/${doc}`;
}

/** File names inside a filing folder, from its directory listing. */
export async function filingFiles(cik: string, accession: string): Promise<string[]> {
  const html = await secText(
    `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath(accession)}/`
  );
  const files = new Set<string>();
  for (const m of html.matchAll(/href="\/Archives\/edgar\/data\/\d+\/\d+\/([^"]+)"/g)) files.add(m[1]);
  return [...files];
}

/* ------------------------------------------------------- filing text */

/**
 * HTML to text with block boundaries kept as newlines, so headings and
 * paragraphs can still be told apart afterwards.
 */
export function htmlToText(html: string): string {
  let t = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<\/(p|div|tr|li|h\d|table|section)>/gi, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, " ")
    .replace(/&#8212;|&mdash;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  t = t.replace(/[ \t\r\f\v]+/g, " ");
  t = t.replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/* ----------------------------------------------------- XBRL instance */

export interface XContext {
  id: string;
  dims: { axis: string; member: string }[];
  start?: string;
  end: string;
}

export interface XFact {
  concept: string;
  contextRef: string;
  unitRef?: string;
  decimals?: string;
  value: string;
}

export function parseInstance(xml: string): { contexts: Map<string, XContext>; facts: XFact[] } {
  const contexts = new Map<string, XContext>();
  for (const m of xml.matchAll(/<(?:xbrli:)?context\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/(?:xbrli:)?context>/g)) {
    const id = m[1];
    const body = m[2];
    const dims: { axis: string; member: string }[] = [];
    for (const d of body.matchAll(/<xbrldi:explicitMember\s+dimension="([^"]+)"\s*>([^<]+)</g)) {
      dims.push({ axis: d[1], member: d[2].trim() });
    }
    const start = body.match(/<(?:xbrli:)?startDate>([^<]+)</)?.[1];
    const end = body.match(/<(?:xbrli:)?endDate>([^<]+)</)?.[1] ?? body.match(/<(?:xbrli:)?instant>([^<]+)</)?.[1];
    if (!end) continue;
    contexts.set(id, { id, dims, start, end });
  }

  const facts: XFact[] = [];
  for (const m of xml.matchAll(
    /<([a-z][a-z0-9-]*:[A-Za-z][A-Za-z0-9]*)\s([^>]*\bcontextRef="[^"]+"[^>]*)>([^<]*)<\/\1>/g
  )) {
    const attrs = m[2];
    const contextRef = attrs.match(/contextRef="([^"]+)"/)?.[1];
    if (!contextRef) continue;
    facts.push({
      concept: m[1],
      contextRef,
      unitRef: attrs.match(/unitRef="([^"]+)"/)?.[1],
      decimals: attrs.match(/decimals="([^"]+)"/)?.[1],
      value: m[3].trim(),
    });
  }
  return { contexts, facts };
}

/**
 * Member or concept name → the label the company gave it, from _lab.xml.
 * The terse label is the one printed in the statements ("Americas"); the
 * standard label is the fallback ("Americas Segment [Member]").
 */
export function parseLabels(labXml: string): Map<string, string> {
  const terse = new Map<string, string>();
  const standard = new Map<string, string>();
  for (const m of labXml.matchAll(/<link:label\s([^>]*)>([^<]*)<\/link:label>/g)) {
    const attrs = m[1];
    const role = attrs.match(/xlink:role="([^"]+)"/)?.[1] ?? "";
    const label = attrs.match(/xlink:label="([^"]+)"/)?.[1];
    if (!label) continue;
    const key = label.replace(/^lab_/, "").replace(/_label.*$/, "").replace(/_terseLabel.*$/, "");
    const text = m[2].trim();
    if (role.endsWith("/role/terseLabel")) {
      if (!terse.has(key)) terse.set(key, text);
    } else if (role.endsWith("/role/label")) {
      if (!standard.has(key)) standard.set(key, text);
    }
  }
  const out = new Map<string, string>(standard);
  for (const [k, v] of terse) out.set(k, v);
  return out;
}

/** "aapl:IPhoneMember" → the filed label, else a readable fallback. */
export function memberLabel(member: string, labels: Map<string, string>): string {
  const key = member.replace(":", "_");
  const hit = labels.get(key);
  if (hit) return hit.replace(/\s*\[Member\]\s*$/i, "").trim();
  const local = member.split(":")[1] ?? member;
  return local
    .replace(/Member$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}
