#!/usr/bin/env node
/**
 * Downloads company logos from Logo.dev, a logo API that licenses marks for
 * identification, and saves them unchanged as PNGs under public/logos/.
 *
 * Two sets:
 *   - the six cube logos for the landing page, at 512px, in public/logos/
 *   - one mark per NASDAQ 50 company for the app's company page, at 256px,
 *     in public/logos/marks/<ticker>.png
 *
 * Usage:
 *   LOGO_DEV_TOKEN=pk_... node scripts/fetch-logos.mjs [--force]
 * or put LOGO_DEV_TOKEN in site/.env and run `npm run logos`.
 *
 * Files that already exist are kept unless --force is passed.
 * `fallback=404` makes the API fail instead of returning a generated
 * monogram, so nothing here is ever a placeholder pretending to be a logo;
 * a failure is printed and the app shows the ticker instead.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(ROOT, "public", "logos");
const FORCE = process.argv.includes("--force");

const CUBES = [
  { file: "apple.png", domain: "apple.com" },
  { file: "nvidia.png", domain: "nvidia.com" },
  { file: "microsoft.png", domain: "microsoft.com" },
  { file: "amazon.png", domain: "amazon.com" },
  { file: "tesla.png", domain: "tesla.com" },
  { file: "alphabet.png", domain: "google.com" },
];

/** Ticker → the company's own domain, which is how Logo.dev keys a mark. */
const MARKS = {
  NVDA: "nvidia.com",
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  AVGO: "broadcom.com",
  MU: "micron.com",
  SKHY: "skhynix.com",
  AMD: "amd.com",
  ASML: "asml.com",
  INTC: "intel.com",
  CSCO: "cisco.com",
  PLTR: "palantir.com",
  LRCX: "lamresearch.com",
  AMAT: "appliedmaterials.com",
  ARM: "arm.com",
  PANW: "paloaltonetworks.com",
  TXN: "ti.com",
  SNDK: "sandisk.com",
  KLAC: "kla.com",
  CRWD: "crowdstrike.com",
  MRVL: "marvell.com",
  QCOM: "qualcomm.com",
  STX: "seagate.com",
  ADI: "analog.com",
  SHOP: "shopify.com",
  WDC: "westerndigital.com",
  FTNT: "fortinet.com",
  APP: "applovin.com",
  GOOGL: "google.com",
  META: "meta.com",
  NFLX: "netflix.com",
  TMUS: "t-mobile.com",
  AMZN: "amazon.com",
  TSLA: "tesla.com",
  BKNG: "bookingholdings.com",
  SBUX: "starbucks.com",
  PDD: "pddholdings.com",
  WMT: "walmart.com",
  COST: "costco.com",
  PEP: "pepsico.com",
  AMGN: "amgen.com",
  GILD: "gilead.com",
  VRTX: "vrtx.com",
  ISRG: "intuitive.com",
  SNY: "sanofi.com",
  SPCX: "spacex.com",
  ADP: "adp.com",
  HOOD: "robinhood.com",
  LIN: "linde.com",
  EQIX: "equinix.com",
  CEG: "constellationenergy.com",
};

function loadToken() {
  if (process.env.LOGO_DEV_TOKEN) return process.env.LOGO_DEV_TOKEN;
  const envPath = path.join(ROOT, ".env");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("LOGO_DEV_TOKEN="));
    if (line) return line.slice("LOGO_DEV_TOKEN=".length).trim();
  }
  return "";
}

const token = loadToken();
if (!token) {
  console.error(
    "LOGO_DEV_TOKEN is not set.\n" +
      "Get a free publishable key at https://www.logo.dev (sign up, copy the pk_... key),\n" +
      "add LOGO_DEV_TOKEN=pk_... to site/.env, then run: npm run logos"
  );
  process.exit(1);
}

async function fetchLogo(domain, size, target) {
  const rel = path.relative(ROOT, target);
  if (existsSync(target) && !FORCE) {
    console.log(`· ${domain} → ${rel} (kept)`);
    return true;
  }
  const url = `https://img.logo.dev/${domain}?token=${token}&size=${size}&format=png&retina=true&fallback=404`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ ${domain}: HTTP ${res.status}`);
    return false;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(target, bytes);
  console.log(`✓ ${domain} → ${rel} (${bytes.length} bytes)`);
  return true;
}

await mkdir(path.join(OUT, "marks"), { recursive: true });

const failed = [];
for (const { file, domain } of CUBES) {
  if (!(await fetchLogo(domain, 512, path.join(OUT, file)))) failed.push(file);
}
for (const [ticker, domain] of Object.entries(MARKS)) {
  const target = path.join(OUT, "marks", `${ticker.toLowerCase()}.png`);
  if (!(await fetchLogo(domain, 256, target))) failed.push(ticker);
}

if (failed.length) {
  console.error(`\n${failed.length} logo(s) not fetched: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("\nAll logos present.");
