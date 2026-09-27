import Anthropic from "@anthropic-ai/sdk";
import type { Fact, Sentence } from "../../lib/research-types.ts";
import { riskOneLiner } from "./text.ts";

/**
 * The writer. Two paths, one contract.
 *
 * With ANTHROPIC_API_KEY set, the model is handed the computed facts, the
 * verdicts already reached, and excerpts of the report, and asked only for
 * words: every sentence must carry the ids of the facts it used. Without a
 * key, fixed templates assemble the same sentences from the same facts.
 * Either way the checker runs afterwards; nothing here is trusted on its own.
 */

export interface MomentCandidate {
  date: string;
  movePct: number;
  factId: string;
  filingUrl: string | null;
  filingForm: string | null;
  filingItems: string | null;
  excerpt: string | null;
}

export interface ComingCandidate {
  date: string;
  kind: "earnings" | "exDividend";
  url: string;
  source: string;
}

export interface WriterInput {
  ticker: string;
  name: string;
  facts: Fact[];
  chips: {
    health: { chip: string; tests: { label: string; pass: boolean | null; detail: string }[] };
    track: { chip: string };
  };
  revenueSources: { name: string; pct: number; factId: string; year: string }[];
  ids: Record<string, string | null>;
  /** The report's own one sentence description, verbatim. */
  about: string | null;
  moments: MomentCandidate[];
  coming: ComingCandidate[];
  riskHeadings: string[];
  riskUrl: string;
  legalExcerpt: string;
  legalUrl: string;
  audit: { auditor: string | null; opinion: string | null; since: number | null };
  currency: string;
}

export interface WriterOutput {
  quickReview: {
    about: Sentence[];
    money: Sentence[];
    track: Sentence[];
    health: Sentence[];
    moments: { date: string; kind: "good" | "bad"; text: string; factIds: string[]; url: string | null }[];
    risks: { text: string; factIds: string[]; url: string }[];
    coming: { date: string; text: string; factIds: string[]; url: string }[];
    peers: Sentence[];
  };
  whatThisMeans: Record<string, Sentence>;
  riskFactors: { title: string; line: string; factIds: string[] }[];
}

export const SECTIONS = [
  "chart",
  "probabilities",
  "financials",
  "ratios",
  "segments",
  "earningsQuality",
  "balanceSheet",
  "risk",
  "audit",
] as const;

const factById = (facts: Fact[]) => new Map(facts.map((f) => [f.id, f]));
const disp = (map: Map<string, Fact>, id: string | null | undefined) => (id ? map.get(id)?.display ?? null : null);

/** The first n words of a sentence, with a marker when it was cut. */
export function firstWords(text: string, n: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text.trim();
  return `${words.slice(0, n).join(" ").replace(/[,;:]$/, "")}...`;
}

/* ------------------------------------------------------------ fallback */

export function writeFallback(input: WriterInput): WriterOutput {
  const m = factById(input.facts);
  const d = (id: string | null | undefined) => disp(m, id);
  const ids = input.ids;
  const has = (...keys: string[]) => keys.every((k) => ids[k] && m.has(ids[k] as string));
  const idsOf = (...keys: string[]) => keys.map((k) => ids[k] as string);

  const about: Sentence[] = input.about ? [{ text: input.about, factIds: [] }] : [];

  const money: Sentence[] = [];
  if (input.revenueSources.length) {
    // Three sources when the names are short, fewer when they are not, so the
    // line stays inside the 20 word limit the checker enforces.
    for (let n = Math.min(3, input.revenueSources.length); n >= 1; n--) {
      const top = input.revenueSources.slice(0, n);
      const text = `${top.map((s) => `${s.name} ${Math.round(s.pct)}%`).join(", ")} of ${top[0].year} revenue.`;
      if (text.split(/\s+/).length <= 20 || n === 1) {
        money.push({ text, factIds: top.map((s) => s.factId) });
        break;
      }
    }
  }

  const track: Sentence[] = [];
  if (has("tradingSince", "yearsPublic")) {
    const years = m.get(ids.yearsPublic as string)?.value;
    track.push(
      typeof years === "number" && years < 1
        ? { text: `Shares began trading in ${d(ids.tradingSince)}.`, factIds: idsOf("tradingSince") }
        : { text: `Trading since ${d(ids.tradingSince)}, ${d(ids.yearsPublic)} public.`, factIds: idsOf("tradingSince", "yearsPublic") }
    );
  }
  if (has("revenueCagr", "profitableYears", "yearsCounted")) {
    track.push({
      text: `Revenue grew ${d(ids.revenueCagr)} a year over ${d(ids.yearsCounted)}, profitable in ${d(ids.profitableYears)}.`,
      factIds: idsOf("revenueCagr", "profitableYears", "yearsCounted"),
    });
  }

  const health: Sentence[] = [];
  if (has("cashAndInvestments", "totalDebt")) {
    health.push({ text: `Cash and investments ${d(ids.cashAndInvestments)}, debt ${d(ids.totalDebt)}.`, factIds: idsOf("cashAndInvestments", "totalDebt") });
  }
  if (has("fcf")) {
    const cov = has("interestCoverage") ? `, interest covered ${d(ids.interestCoverage)}` : ", interest expense not reported";
    health.push({ text: `Free cash flow ${d(ids.fcf)}${cov}.`, factIds: [ids.fcf as string, ...(has("interestCoverage") ? [ids.interestCoverage as string] : [])] });
  }

  const up = input.moments.filter((c) => c.movePct >= 0).slice(0, 2);
  const down = input.moments.filter((c) => c.movePct < 0).slice(0, 2);
  const moments = [...up, ...down].map((c) => ({
    date: c.date,
    kind: (c.movePct >= 0 ? "good" : "bad") as "good" | "bad",
    text: `Shares ${c.movePct >= 0 ? "rose" : "fell"} ${Math.abs(c.movePct).toFixed(1)}% in one day${c.filingForm ? `, ${c.filingForm} filed nearby` : ""}.`,
    factIds: [c.factId],
    url: c.filingUrl,
  }));

  const risks = input.riskHeadings.slice(0, 3).map((h) => ({ text: riskOneLiner(h), factIds: [], url: input.riskUrl }));

  const coming = input.coming.map((c) => ({
    date: c.date,
    text: c.kind === "earnings" ? `Next earnings report scheduled for ${c.date}.` : `Shares trade without the next dividend from ${c.date}.`,
    factIds: [],
    url: c.url,
  }));

  const peers: Sentence[] = [];
  if (has("pe", "peMedian")) {
    peers.push({ text: `Price to earnings ${d(ids.pe)} against a peer median of ${d(ids.peMedian)}.`, factIds: idsOf("pe", "peMedian") });
  }
  if (has("opMargin", "opMarginMedian")) {
    peers.push({ text: `Operating margin ${d(ids.opMargin)} against ${d(ids.opMarginMedian)} for peers.`, factIds: idsOf("opMargin", "opMarginMedian") });
  }

  const eqLine = has("eqPass", "eqTotal")
    ? `${d(ids.eqPass)} of ${d(ids.eqTotal)} checks pass; each asks whether reported profit is backed by cash.`
    : "Each check asks whether reported profit is backed by cash.";
  const whatThisMeans: Record<string, Sentence> = {
    chart: { text: "Real daily candles with 20 and 50 day averages, RSI and mapped support and resistance.", factIds: ["chart.ma20", "chart.ma50"] },
    probabilities: {
      text: has("simPaths", "simDays") ? `${d(ids.simPaths)} paths built from ${d(ids.simDays)} of this stock's own moves, not a forecast.` : "Paths built from this stock's own past moves, not a forecast.",
      factIds: has("simPaths", "simDays") ? idsOf("simPaths", "simDays") : [],
    },
    financials: { text: `Five fiscal years plus the trailing twelve months, straight from filings, in ${input.currency}.`, factIds: [] },
    ratios: {
      text: has("peerCount") ? `Margins, returns and valuation beside ${d(ids.peerCount)} peers from the same sector.` : "Margins, returns and valuation beside peers from the same sector.",
      factIds: has("peerCount") ? idsOf("peerCount") : [],
    },
    segments: { text: "Revenue by the segments and regions the company itself reports, names unchanged.", factIds: [] },
    earningsQuality: { text: eqLine, factIds: has("eqPass", "eqTotal") ? idsOf("eqPass", "eqTotal") : [] },
    balanceSheet: { text: "What the company owns against what it owes, and when its debt comes due.", factIds: [] },
    risk: { text: "Levels come from fixed rules on prices, debt, concentration and the legal section.", factIds: [] },
    audit: {
      text:
        input.audit.auditor && has("auditSince")
          ? `${input.audit.auditor} has audited the company since ${d(ids.auditSince)}; the latest opinion is ${(input.audit.opinion ?? "on file").toLowerCase()}.`
          : "Who checks the books, for how long, and what they concluded.",
      factIds: has("auditSince") ? idsOf("auditSince") : [],
    },
  };

  const riskFactors = input.riskHeadings.slice(0, 5).map((h) => ({ title: riskOneLiner(h), line: firstWords(h, 20), factIds: [] }));

  return { quickReview: { about, money, track, health, moments, risks, coming, peers }, whatThisMeans, riskFactors };
}

/* ------------------------------------------------------------- claude */

const SYSTEM = [
  "You write CIP's company research in plain English a beginner understands.",
  "You may use ONLY the facts you are given, by id. Every sentence lists the fact ids it used. Never compute, estimate, round differently, or add a number that is not in the facts.",
  "Copy each fact's display text exactly when you state its value.",
  "Sentences of 20 words at most. Facts, not opinions. No buy, sell, hold, undervalued, overvalued, targets, predictions or hype words.",
  "Never use an em dash or an en dash. Use commas, colons or full stops.",
  "Do not mention other research platforms or competitors.",
  "The verdict chips are given to you and are final; describe them, never change them.",
  "Big moments must come only from the candidate events supplied, with their dates and links. What is coming must come only from the dated items supplied.",
  "Risks: pick the three most material from the supplied headings and state each in one short line of plain words.",
  "About: one sentence saying what the company does, based only on the supplied description.",
].join(" ");

const SENTENCE = {
  type: "object",
  additionalProperties: false,
  required: ["text", "factIds"],
  properties: { text: { type: "string" }, factIds: { type: "array", items: { type: "string" } } },
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["about", "money", "track", "health", "moments", "risks", "coming", "peers", "whatThisMeans", "riskFactors"],
  properties: {
    about: { type: "array", maxItems: 1, items: SENTENCE },
    money: { type: "array", maxItems: 2, items: SENTENCE },
    track: { type: "array", maxItems: 2, items: SENTENCE },
    health: { type: "array", maxItems: 2, items: SENTENCE },
    moments: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "kind", "text", "factIds"],
        properties: {
          date: { type: "string" },
          kind: { type: "string", enum: ["good", "bad"] },
          text: { type: "string" },
          factIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    risks: { type: "array", maxItems: 3, items: SENTENCE },
    coming: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "text", "factIds"],
        properties: { date: { type: "string" }, text: { type: "string" }, factIds: { type: "array", items: { type: "string" } } },
      },
    },
    peers: { type: "array", maxItems: 2, items: SENTENCE },
    whatThisMeans: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "text", "factIds"],
        properties: {
          section: { type: "string", enum: [...SECTIONS] },
          text: { type: "string" },
          factIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    riskFactors: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "line"],
        properties: { title: { type: "string" }, line: { type: "string" } },
      },
    },
  },
} as const;

const MODELS = [process.env.CIP_RESEARCH_MODEL, "claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5"].filter(
  (m): m is string => !!m
);

export async function writeWithClaude(input: WriterInput): Promise<{ out: WriterOutput; model: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  const payload = {
    company: `${input.name} (${input.ticker})`,
    currency: input.currency,
    verdicts: input.chips,
    facts: input.facts.map((f) => ({ id: f.id, label: f.label, display: f.display })),
    description: input.about,
    revenueSources: input.revenueSources,
    momentCandidates: input.moments,
    comingItems: input.coming,
    riskFactorHeadings: input.riskHeadings.slice(0, 40),
    legalProceedingsExcerpt: input.legalExcerpt,
    audit: input.audit,
    task:
      "Write: about (one sentence), money (where the money comes from), track (track record), health (financial health), moments (up to 3 good and 3 bad from the candidates, one line each), risks (the 3 most material, one line each), coming (from the dated items only), peers (how margins and valuation compare with the peer median, using the ratio and median facts), whatThisMeans (one line of 20 words max for each of: chart, probabilities, financials, ratios, segments, earningsQuality, balanceSheet, risk, audit), riskFactors (top 5 from the headings: short title and one line). The quick review parts together must stay under 150 words.",
  };

  let lastErr: unknown = null;
  for (const model of MODELS) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: JSON.stringify(payload) }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const text = (response.content ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((b: any) => (b.type === "text" ? b.text : ""))
        .join("");
      const parsed = JSON.parse(text) as {
        about: Sentence[];
        money: Sentence[];
        track: Sentence[];
        health: Sentence[];
        moments: { date: string; kind: "good" | "bad"; text: string; factIds: string[] }[];
        risks: Sentence[];
        coming: { date: string; text: string; factIds: string[] }[];
        peers: Sentence[];
        whatThisMeans: { section: string; text: string; factIds: string[] }[];
        riskFactors: { title: string; line: string }[];
      };
      const momentUrl = new Map(input.moments.map((c) => [c.date, c.filingUrl]));
      const comingUrl = new Map(input.coming.map((c) => [c.date, c.url]));
      const wtm: Record<string, Sentence> = {};
      for (const w of parsed.whatThisMeans) wtm[w.section] = { text: w.text, factIds: w.factIds };
      return {
        model,
        out: {
          quickReview: {
            about: parsed.about,
            money: parsed.money,
            track: parsed.track,
            health: parsed.health,
            moments: parsed.moments.map((x) => ({ ...x, url: momentUrl.get(x.date) ?? null })),
            risks: parsed.risks.map((s) => ({ ...s, url: input.riskUrl })),
            coming: parsed.coming.map((x) => ({ ...x, url: comingUrl.get(x.date) ?? input.legalUrl })),
            peers: parsed.peers,
          },
          whatThisMeans: wtm,
          riskFactors: parsed.riskFactors.map((r) => ({ ...r, factIds: [] })),
        },
      };
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      if (/not_found|model|permission|404/i.test(msg)) continue;
      throw err;
    }
  }
  console.error("[research] every model failed:", lastErr);
  return null;
}

/** One more try for a sentence the checker rejected. Claude only. */
export async function rewriteSentence(
  model: string,
  input: WriterInput,
  sentence: Sentence,
  reason: string
): Promise<Sentence | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 400,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SENTENCE } },
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            facts: input.facts.map((f) => ({ id: f.id, label: f.label, display: f.display })),
            sentence,
            problem: reason,
            task: "Rewrite this one sentence so it passes: use only given facts, copy their display text exactly, 20 words max, no dashes.",
          }),
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const text = (response.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => (b.type === "text" ? b.text : ""))
      .join("");
    return JSON.parse(text) as Sentence;
  } catch (err) {
    console.error("[research] rewrite failed:", err);
    return null;
  }
}
