import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { CompanyResearch } from "./research-types";

/**
 * Reads the research the pipeline wrote for a ticker. Pages are generated at
 * build time from these files, so a missing file means "not built yet", never
 * an empty page pretending to be data.
 */
const DIR = path.join(process.cwd(), "data", "companies");

export function loadResearch(ticker: string): CompanyResearch | null {
  try {
    const raw = readFileSync(path.join(DIR, `${ticker.toUpperCase()}.json`), "utf8");
    return JSON.parse(raw) as CompanyResearch;
  } catch {
    return null;
  }
}

export function researchedTickers(): string[] {
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
