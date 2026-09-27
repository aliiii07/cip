import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * The annual reports and prospectuses supplied as PDFs, one per company.
 *
 * Text comes from a font aware pass (PyMuPDF, scripts/research/pdf_blocks.py)
 * so that bold headings are their own blocks and wrapped paragraphs are
 * whole, with running page headers dropped. When that is unavailable the
 * plain pdftotext output is re-flowed instead. Results are cached beside the
 * data files (ignored by git; only what the pipeline derives is committed).
 *
 * Used for prose only: business description, risk factors, legal
 * proceedings and the auditor's report. Never for a number.
 */

const DEFAULT_DIR = "/Users/macbook2air/Downloads/AyuGram Desktop/Data 2";
const BLOCKS_SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), "pdf_blocks.py");

export const REPORT_FILES: Record<string, string> = {
  NVDA: "NVIDIA-2025-Annual-Report.pdf",
  AAPL: "Apple_2025_Annual_Report.pdf",
  MSFT: "MSFT_2025_annual_report.pdf",
  AVGO: "AVGO_2025_annual_report.pdf",
  MU: "Mu.pdf",
  SKHY: "Skhy.pdf",
  AMD: "Amd.pdf",
  ASML: "Asml.pdf",
  INTC: "Intc.pdf",
  CSCO: "Osco.pdf",
  PLTR: "Pltr.pdf",
  LRCX: "Lrcx.pdf",
  AMAT: "Amat.pdf",
  ARM: "Arm.pdf",
  PANW: "Panw.pdf",
  TXN: "Txn.pdf",
  SNDK: "Sndx.pdf",
  KLAC: "Klac.pdf",
  CRWD: "Crwd.pdf",
  MRVL: "Mrvl.pdf",
  QCOM: "Qcom.pdf",
  STX: "Stx.pdf",
  ADI: "Adi.pdf",
  SHOP: "Shop.pdf",
  WDC: "Wdc.pdf",
  FTNT: "Ftnt.pdf",
  APP: "App.pdf",
  GOOGL: "Google.pdf",
  META: "meta.pdf",
  NFLX: "Nflx.pdf",
  TMUS: "Tmus.pdf",
  AMZN: "Amazon.pdf",
  TSLA: "Tesla.pdf",
  BKNG: "Bkng.pdf",
  SBUX: "Sbux.pdf",
  PDD: "Pdd.pdf",
  WMT: "Wmt.pdf",
  COST: "Cost.pdf",
  PEP: "Pep.pdf",
  AMGN: "Amgn.pdf",
  GILD: "Gild.pdf",
  VRTX: "Vrtx.pdf",
  ISRG: "Isrg.pdf",
  SNY: "Sny.pdf",
  SPCX: "SPXC.pdf",
  ADP: "Adp.pdf",
  HOOD: "Hood.pdf",
  LIN: "Lin.pdf",
  EQIX: "Eqix.pdf",
  CEG: "Ceg.pdf",
};

export type ReportKind = "10-K" | "20-F" | "40-F" | "F-1" | "S-1" | "424B4" | "Annual report";

export interface Block {
  t: string;
  b: boolean;
  s: number;
}

export interface Report {
  file: string;
  kind: ReportKind;
  /** One line per block: headings and paragraphs. */
  text: string;
  /** Bold blocks, the candidates for headings. */
  boldLines: string[];
}

function detectKind(text: string): ReportKind {
  const head = text.slice(0, 8000);
  if (/FORM 10-K/i.test(head)) return "10-K";
  if (/FORM 20-F/i.test(head)) return "20-F";
  if (/FORM 40-F/i.test(head)) return "40-F";
  if (/424\(b\)\(4\)|424B4/i.test(head)) return "424B4";
  if (/FORM F-1/i.test(head)) return "F-1";
  if (/FORM S-1/i.test(head)) return "S-1";
  return "Annual report";
}

/** Plain pdftotext output: drop print artefacts, join wrapped lines into paragraphs. */
function reflow(raw: string): string {
  const lines = raw
    .replace(/\f/g, "\n\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => !/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}\b/.test(l))
    .filter((l) => !/^\d+\/\d+$/.test(l))
    .filter((l) => !/^https?:\/\/www\.sec\.gov\S*$/.test(l));
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (l === "") {
      if (cur.length) blocks.push(cur.join(" "));
      cur = [];
    } else cur.push(l);
  }
  if (cur.length) blocks.push(cur.join(" "));
  return blocks.join("\n");
}

function fontAware(pdf: string): Block[] | null {
  try {
    const out = execFileSync("python3", [BLOCKS_SCRIPT, pdf], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    const blocks = JSON.parse(out) as Block[];
    return blocks.length > 50 ? blocks : null;
  } catch (err) {
    console.error(`[research] pdf_blocks.py failed for ${path.basename(pdf)}: ${String(err).slice(0, 120)}`);
    return null;
  }
}

export function loadReport(ticker: string, root: string): Report | null {
  const dir = process.env.CIP_REPORTS_DIR || DEFAULT_DIR;
  const file = REPORT_FILES[ticker];
  if (!file) return null;
  const pdf = path.join(dir, file);
  if (!existsSync(pdf)) return null;

  const cacheDir = path.join(root, "data", "reports");
  mkdirSync(cacheDir, { recursive: true });
  const cache = path.join(cacheDir, `${ticker}.json`);
  let blocks: Block[] | null = null;
  if (existsSync(cache) && statSync(cache).mtimeMs >= statSync(pdf).mtimeMs) {
    blocks = JSON.parse(readFileSync(cache, "utf8")) as Block[];
  } else {
    blocks = fontAware(pdf);
    if (!blocks) {
      try {
        const raw = execFileSync("pdftotext", ["-q", pdf, "-"], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
        blocks = reflow(raw)
          .split("\n")
          .map((t) => ({ t, b: false, s: 0 }));
      } catch (err) {
        console.error(`[research] pdftotext failed for ${file}:`, String(err).slice(0, 120));
        return null;
      }
    }
    writeFileSync(cache, JSON.stringify(blocks));
  }
  const text = blocks.map((b) => b.t).join("\n");
  return {
    file,
    kind: detectKind(text),
    text,
    boldLines: blocks.filter((b) => b.b).map((b) => b.t),
  };
}
