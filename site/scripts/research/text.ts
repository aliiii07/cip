/**
 * Reads the parts of an annual report that are prose, not XBRL: risk
 * factors, legal proceedings, controls, and the auditor's report. Everything
 * is located by the report's own headings; nothing is summarised here.
 */

export interface FilingText {
  riskFactors: string;
  riskHeadings: string[];
  legal: string;
  controls: string;
  auditReport: string;
  business: string;
  foundedYear: number | null;
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

export function extractSections(text: string, form: string): FilingText {
  const is20F = form.startsWith("20-F") || form.startsWith("40-F");
  const riskFactors = is20F
    ? section(text, /Risk Factors\s*\n/gi, /\n\s*(Item 4|4\.\s*Information on the Company|Information on the Company)/i)
    : section(text, /Item\s*1A\.?\s*Risk Factors/gi, /\n\s*Item\s*1B\b/i);
  const legal = is20F
    ? section(text, /Legal Proceedings\s*\n/gi, /\n\s*(Dividend|Item 8|Significant Changes)/i)
    : section(text, /Item\s*3\.?\s*Legal Proceedings/gi, /\n\s*Item\s*4\b/i);
  const controls = is20F
    ? section(text, /Item\s*15\.?\s*Controls and Procedures/gi, /\n\s*Item\s*16/i)
    : section(text, /Item\s*9A\.?\s*Controls and Procedures/gi, /\n\s*Item\s*9B\b/i);
  const business = is20F
    ? section(text, /Business Overview/gi, /\n\s*(Organizational Structure|Property, Plants)/i)
    : section(text, /Item\s*1\.?\s*Business\s*\n/gi, /\n\s*Item\s*1A\b/i);
  const auditReport = section(
    text,
    /Report of Independent Registered Public Accounting Firm/gi,
    /\n\s*(Item\s*9\.?\s*Changes in and Disagreements|Item\s*9A|Consolidated Statements of|CONSOLIDATED STATEMENTS OF|Item 18)/i
  );

  // "incorporated by reference" is boilerplate; the real sentence names a place or a year.
  const foundedMatch = business
    .replace(/incorporated (?:herein )?by reference/gi, "")
    .match(/\b(?:incorporated|founded|organized|established|formed)\b[^.\n]{0,60}?\b(19\d{2}|20\d{2})\b/i);

  return {
    riskFactors,
    riskHeadings: riskHeadings(riskFactors),
    legal,
    controls,
    auditReport,
    business: business.slice(0, 6000),
    foundedYear: foundedMatch ? Number(foundedMatch[1]) : null,
  };
}

/**
 * Risk factor headings are the one sentence lines that introduce a longer
 * paragraph. Group titles (a few words, no full stop) are skipped.
 */
export function riskHeadings(riskFactors: string): string[] {
  const lines = riskFactors.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i];
    const next = lines[i + 1];
    if (l.length < 40 || l.length > 320) continue;
    if (!/[.]$/.test(l)) continue;
    if (next.length < 200) continue;
    if (/^(Item|Table of Contents|Apple Inc\.|\d+$)/i.test(l)) continue;
    out.push(l);
  }
  return out;
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
  const since = rep.match(/served as the Company['’]s auditor since (\d{4})/i)?.[1];

  // The signature block: "/s/ Ernst & Young LLP" then the office, then the date.
  const sig = rep.match(/\/s\/\s*([^\n]+?(?:LLP|LLC|L\.L\.P\.|S\.A\.|PLC|Inc\.|GmbH|Ltd\.?))\s*\n\s*([^\n]{3,60})\s*\n\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  let auditor = sig?.[1]?.trim() ?? null;
  let location = sig?.[2]?.trim() ?? null;
  const reportDate = sig?.[3] ? isoDate(sig[3]) : null;
  if (!auditor) {
    const named = rep.match(/\b([A-Z][A-Za-z&.,' ]{2,50}?(?:LLP|LLC|PLC|S\.A\.|GmbH))\b/);
    auditor = named?.[1]?.trim() ?? null;
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

  // Critical audit matters: a short heading followed within a few lines by
  // "Description of the Matter".
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
