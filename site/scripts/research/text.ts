/**
 * Reads the parts of an annual report or prospectus that are prose, not
 * XBRL: the business description, risk factors, legal proceedings, controls,
 * and the auditor's report. Everything is located by the document's own
 * headings; nothing is summarised here.
 */

export interface FilingText {
  riskFactors: string;
  riskHeadings: string[];
  legal: string;
  controls: string;
  auditReport: string;
  business: string;
  foundedYear: number | null;
  /** The document's own one sentence description of what the company does. */
  about: string | null;
}

/**
 * A section runs from its heading to the next item heading. The table of
 * contents repeats every heading, so among the candidates the longest run
 * is the real one.
 */
function section(text: string, start: RegExp, end: RegExp): string {
  const starts = [...text.matchAll(start)].map((m) => m.index as number);
  let best = "";
  for (const s of starts) {
    const rest = text.slice(s + 1);
    const e = rest.search(end);
    const chunk = e === -1 ? rest : rest.slice(0, e);
    if (chunk.length > best.length) best = chunk;
  }
  return best.trim();
}

const AUDIT_START = /Report of (?:the )?Independent (?:Registered Public Accounting Firm|Auditors?)/gi;
const AUDIT_END = /\n\s*(Item\s*9\.?\s*Changes in and Disagreements|Item\s*9A|Consolidated Statements? of|CONSOLIDATED STATEMENTS? OF|Item 18|Item 19|Consolidated Balance Sheets?|CONSOLIDATED BALANCE SHEETS?)/i;

export function extractSections(text: string, form: string, boldLines: string[] = [], name = ""): FilingText {
  const is20F = /^(20-F|40-F)/.test(form);
  const isProspectus = /^(F-1|S-1|424B4)/.test(form);

  let riskFactors: string;
  let legal: string;
  let controls = "";
  let business: string;
  if (isProspectus) {
    riskFactors = section(text, /\n\s*RISK FACTORS\s*\n/g, /\n\s*(USE OF PROCEEDS|CAUTIONARY NOTE|SPECIAL NOTE REGARDING|DIVIDEND POLICY|CAPITALIZATION)\s*\n/);
    legal = section(text, /\n\s*Legal Proceedings\s*\n/gi, /\n\s*(MANAGEMENT|Properties|Employees|Human Capital|Intellectual Property)\b/i);
    business = section(text, /\n\s*(?:BUSINESS|Our Business|Overview)\s*\n/g, /\n\s*(MANAGEMENT|RISK FACTORS|REGULATION|LEGAL PROCEEDINGS)\s*\n/);
  } else if (is20F) {
    riskFactors = section(text, /\n\s*(?:Item\s*3\.?D\.?\s*)?Risk Factors\s*\n/gi, /\n\s*(Item 4\b|4\.\s*Information on the Company|Information on the Company|Financial performance\s*\n|Corporate governance\s*\n|Consolidated (?:statements?|balance)|Report of the|Independent auditor|Unresolved Staff Comments)/i);
    legal = section(text, /Legal Proceedings\s*\n/gi, /\n\s*(Dividend|Item 8|Significant Changes|Item 9)/i);
    controls = section(text, /Item\s*15\.?\s*Controls and Procedures/gi, /\n\s*Item\s*16/i);
    business = section(text, /Business Overview\s*\n/gi, /\n\s*(Organizational Structure|Property, Plants|Item 4\.?C|Item 5)/i);
  } else {
    riskFactors = section(text, /Item\s*1A\.?\s*Risk Factors/gi, /\n\s*Item\s*1B\b/i);
    legal = section(text, /Item\s*3\.?\s*Legal Proceedings/gi, /\n\s*Item\s*4\b/i);
    controls = section(text, /Item\s*9A\.?\s*Controls and Procedures/gi, /\n\s*Item\s*9B\b/i);
    business = section(text, /Item\s*1\.?\s*Business\s*\n/gi, /\n\s*Item\s*1A\b/i);
  }

  let auditReport = section(text, AUDIT_START, AUDIT_END);
  // Some reports head the report differently; the tenure sentence is the
  // surest anchor, so take a window around it when the heading was not found.
  if (!/auditor since/i.test(auditReport)) {
    const i = text.search(/served as the (?:Company|Group)['’]s auditor since \d{4}/i);
    if (i >= 0) auditReport = text.slice(Math.max(0, i - 9000), i + 2500);
  }

  const foundedMatch = business
    .replace(/incorporated (?:herein )?by reference/gi, "")
    .match(/\b(?:incorporated|founded|organized|established|formed)\b[^.\n]{0,60}?\b(19\d{2}|20\d{2})\b/i);

  return {
    riskFactors,
    riskHeadings: riskHeadings(riskFactors, boldLines),
    legal,
    controls,
    auditReport,
    business: business.slice(0, 8000),
    foundedYear: foundedMatch ? Number(foundedMatch[1]) : null,
    about: aboutSentence(business, name) ?? aboutSentence(text, name),
  };
}

/** Prefer a section that has the anchor it needs; fall back to the other document. */
export function mergeSections(primary: FilingText | null, fallback: FilingText | null): FilingText {
  const p = primary ?? emptyText();
  const f = fallback ?? emptyText();
  const pick = (a: string, b: string, need?: RegExp) => (a && (!need || need.test(a)) ? a : b || a);
  // Risk factors: whichever document yielded headings.
  const useFallbackRisk = p.riskHeadings.length < 3 && f.riskHeadings.length > p.riskHeadings.length;
  const riskFactors = useFallbackRisk ? f.riskFactors : p.riskFactors || f.riskFactors;
  const business = pick(p.business, f.business);
  return {
    riskFactors,
    riskHeadings: useFallbackRisk ? f.riskHeadings : p.riskHeadings.length ? p.riskHeadings : f.riskHeadings,
    legal: pick(p.legal, f.legal),
    controls: pick(p.controls, f.controls),
    auditReport: pick(p.auditReport, f.auditReport, /auditor since/i),
    business,
    foundedYear: p.foundedYear ?? f.foundedYear,
    about: p.about ?? f.about,
  };
}

export function emptyText(): FilingText {
  return { riskFactors: "", riskHeadings: [], legal: "", controls: "", auditReport: "", business: "", foundedYear: null, about: null };
}

/**
 * Risk factor headings are the one sentence lines that introduce a longer
 * paragraph. Group titles (a few words, no full stop) are skipped.
 */
export function riskHeadings(riskFactors: string, boldLines: string[] = []): string[] {
  const lines = riskFactors.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  // A heading starts a thought: capital letter, not a continuation word, not a date.
  const usable = (l: string) =>
    l.length >= 40 &&
    l.length <= 320 &&
    /^[A-Z]/.test(l) &&
    !/^(Item|Table of Contents|These|Moreover|The foregoing|In addition|Furthermore|However|Also|As a result|Accordingly|Such|Any such|For example)\b/i.test(l) &&
    !/^\d/.test(l) &&
    !/[–—]/.test(l);
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i];
    const next = lines[i + 1];
    if (!usable(l) || !/[.]$/.test(l) || next.length < 200) continue;
    out.push(l);
  }
  if (out.length >= 5 || boldLines.length === 0) return out;
  // Reports that set risk titles in bold without a full stop: take the bold
  // lines inside the section that are followed by a paragraph.
  const bold = new Set(boldLines);
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i];
    if (!bold.has(l) || !usable(l) || l.split(/\s+/).length < 5 || lines[i + 1].length < 80) continue;
    if (!out.includes(l)) out.push(l);
  }
  return out;
}

/**
 * A risk heading cut to its first clause, so it reads as one line. The
 * result is a verbatim prefix of the heading, which the checker can verify
 * against the document.
 */
export function riskOneLiner(heading: string): string {
  const words = heading.trim().replace(/[.]$/, "").split(/\s+/);
  if (words.length <= 18) return `${words.join(" ")}.`;
  const head = words.slice(0, 19).join(" ");
  // Cut at the last clause boundary that leaves at least eight words.
  let cut = -1;
  for (const m of head.matchAll(/,|;| which | because | that could/g)) {
    const i = m.index as number;
    if (head.slice(0, i).split(/\s+/).length >= 8) cut = i;
  }
  let line = cut > 0 ? head.slice(0, cut) : words.slice(0, 15).join(" ");
  line = line.replace(/[,;:]$/, "").replace(/\s+(and|or|the|a|an|of|to|in|with|for|on|by|as|that|which|our|its|their)$/i, "").trim();
  // A hard cut that leaves one or two words after the last "and" or "or"
  // strands a fragment; end at the conjunction instead.
  const tail = line.match(/\s(?:and|or)\s+(\S+(?:\s\S+)?)$/);
  if (cut <= 0 && tail) line = line.slice(0, line.length - tail[0].length).trim();
  return `${line}.`;
}

/**
 * The company's own description: the first sentence of the business
 * section that says what it does, kept short. Verbatim, so it is quoted and
 * linked rather than paraphrased.
 */
/**
 * The company's own description: the first sentence, in document order,
 * whose subject is the company (its name, "we", "our", "the Company") and
 * whose verb says what it does. No digits: a description needs none, and
 * a cut number would mislead. Verbatim, so it is quoted and linked.
 */
export function aboutSentence(text: string, name: string): string | null {
  // Two shapes, with the verb right after the subject so "We aim to build" or
  // "We may delay" cannot pass: "<subject> designs/makes/sells ..." or
  // "<subject> is a/one of ... <kind of company>".
  const nameStem = name.split(/\s+/)[0].replace(/[^A-Za-z]/g, "");
  const subjectPart = `(?:We|Our company|The Company|The Group|${nameStem}\\b[^,.]{0,40}?)`;
  const adverb = "(?:\\s+(?:also|primarily|currently|today|mainly))?";
  const does = new RegExp(`^${subjectPart}${adverb}\\s+(?:designs?|develops?|manufactures?|provides?|operates?|sells?|offers?)\\b`, "i");
  const isA = new RegExp(`^${subjectPart}${adverb}\\s+(?:is a|is an|is the|are a|are an|is one of|are one of|is the world|are the world)\\b`, "i");
  const kind = /\b(compan(?:y|ies)|provider|supplier|manufacturer|developer|leader|platform|producer|maker|business|firm|network|enterprise|retailer|operator|distributor|brand|marketplace|bank|broker)\b/i;
  const verb = { test: (t: string) => does.test(t) || (isA.test(t) && kind.test(t)) };
  const subject = { test: (t: string) => /^[A-Z]/.test(t) };
  const HEADING = /^(?:Item\s*1\.?\s*)?(?:Business|Overview|Company Background|Company Overview|General|Our Company|Introduction|Our Business|Business Overview|Our Mission)\s+/i;
  for (const raw of text.split("\n")) {
    const block = raw.replace(HEADING, "").replace(HEADING, "").trim();
    if (block.length < 60) continue;
    const sentences = block.match(/[^.!?]{40,400}[.!?]/g) ?? [];
    for (const s of sentences) {
      const t = s.trim();
      if (!subject.test(t) || !verb.test(t)) continue;
      if (/\d/.test(t)) continue;
      if (/incorporated|table of contents|forward.looking|annual report|form 10-k|form 20-f|fiscal year|this prospectus|truly|proud|passion|believe|mission/i.test(t)) continue;
      return shortenQuote(t, 20);
    }
  }
  return null;
}

/**
 * A verbatim sentence cut to at most n words at the last clause boundary,
 * so it still reads as a sentence and stays a prefix of the original.
 */
export function shortenQuote(text: string, n: number): string {
  const words = text.trim().replace(/[.!?]$/, "").split(/\s+/);
  if (words.length <= n) return `${words.join(" ")}.`;
  const head = words.slice(0, n).join(" ");
  const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(" and "), head.lastIndexOf(" which "));
  const line = cut > 30 ? head.slice(0, cut) : head;
  return `${line.replace(/[,;:]$/, "").trim()}.`;
}

/* --------------------------------------------------------------- audit */

export interface AuditRead {
  auditor: string | null;
  location: string | null;
  since: number | null;
  opinion: string | null;
  icfrEffective: boolean | null;
  materialWeakness: boolean | null;
  cams: string[];
  reportDate: string | null;
}

export function readAudit(f: FilingText): AuditRead {
  const rep = f.auditReport;
  const since = rep.match(/served as the (?:Company|Group)['’]s auditor since (\d{4})/i)?.[1];

  // The signature block: "/s/ Ernst & Young LLP" then the office, then the date.
  const sig = rep.match(/\/s\/\s*([^\n]+?(?:LLP|LLC|L\.L\.P\.|S\.A\.|PLC|Inc\.|GmbH|Ltd\.?|N\.V\.|Accountants))\s*\n\s*([^\n]{3,60})\s*\n\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  let auditor = sig?.[1]?.trim() ?? null;
  let location = sig?.[2]?.trim() ?? null;
  let reportDate = sig?.[3] ? isoDate(sig[3]) : null;
  if (!auditor) {
    const named = rep.match(/\b((?:Ernst & Young|Deloitte|KPMG|PricewaterhouseCoopers|BDO|Grant Thornton)[A-Za-z&.,' ]{0,40}?(?:LLP|LLC|PLC|S\.A\.|GmbH|N\.V\.|Accountants N\.V\.|Ltd\.?)?)/);
    auditor = named?.[1]?.trim() ?? null;
  }
  if (!reportDate) {
    const d = rep.match(/([A-Z][a-z]+ \d{1,2}, \d{4})\s*$/m)?.[1];
    reportDate = d ? isoDate(d) : null;
  }
  if (location && /^\d/.test(location)) location = null;

  const opinion = rep
    ? /present fairly, in all material respects/i.test(rep)
      ? "Unqualified"
      : /except for/i.test(rep)
        ? "Qualified"
        : "See report"
    : null;

  const icfrText = `${rep}\n${f.controls}`;
  let icfrEffective: boolean | null = null;
  if (/maintained, in all material respects, effective internal control/i.test(rep)) icfrEffective = true;
  else if (/internal control over financial reporting (?:was|is) effective/i.test(f.controls)) icfrEffective = true;
  else if (/internal control over financial reporting (?:was|is) not effective/i.test(icfrText)) icfrEffective = false;

  const mw = /(?:identified|existed|exists|concluded that|have|has|there (?:is|was))\s+(?:a |one |two |the following )?material weakness/i.test(icfrText.replace(/A material weakness is a deficiency[^.]*\./gi, ""));
  const materialWeakness = rep || f.controls ? mw : null;

  const cams: string[] = [];
  const camIdx = rep.search(/Critical Audit Matters?/i);
  if (camIdx >= 0) {
    const lines = rep.slice(camIdx).split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (/^Description of the Matter/i.test(lines[i])) {
        for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
          const cand = lines[k];
          if (cand.length >= 4 && cand.length <= 120 && !/critical audit matter/i.test(cand) && !/^(The critical audit matter|Communication of)/i.test(cand)) {
            if (!cams.includes(cand)) cams.push(cand);
            break;
          }
        }
      }
    }
  }

  return { auditor, location, since: since ? Number(since) : null, opinion, icfrEffective, materialWeakness, cams, reportDate };
}

function isoDate(s: string): string | null {
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- legal */

export function readLegal(legal: string): { materialLanguage: boolean; namedCases: number; excerpt: string } {
  const materialLanguage =
    /(?:fine|penalty|judgment|damages)\s+of\s+(?:approximately\s+|up to\s+)?[$€£]\s?\d/i.test(legal) ||
    /material loss (?:is|was) (?:probable|reasonably possible)/i.test(legal);
  const named = legal.match(/\bv\.\s|\bversus\b|Department of Justice|European Commission|Federal Trade Commission|class action|antitrust/gi) ?? [];
  return { materialLanguage, namedCases: Math.min(20, named.length), excerpt: legal.slice(0, 3000) };
}
