#!/usr/bin/env node
/**
 * Downloads the six company logos for the cubes section from Logo.dev, a
 * logo API that licenses marks for identification, and saves them unchanged
 * as high resolution PNGs in public/logos/.
 *
 * Usage:
 *   LOGO_DEV_TOKEN=pk_... node scripts/fetch-logos.mjs
 * or put LOGO_DEV_TOKEN in site/.env and run `npm run logos`.
 *
 * `fallback=404` makes the API fail instead of returning a generated
 * monogram, so nothing here is ever a placeholder pretending to be a logo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(ROOT, "public", "logos");

const LOGOS = [
  { file: "apple.png", domain: "apple.com" },
  { file: "nvidia.png", domain: "nvidia.com" },
  { file: "microsoft.png", domain: "microsoft.com" },
  { file: "amazon.png", domain: "amazon.com" },
  { file: "tesla.png", domain: "tesla.com" },
  { file: "alphabet.png", domain: "google.com" },
];

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

await mkdir(OUT, { recursive: true });

let failed = 0;
for (const { file, domain } of LOGOS) {
  const url = `https://img.logo.dev/${domain}?token=${token}&size=512&format=png&retina=true&fallback=404`;
  const res = await fetch(url);
  if (!res.ok) {
    failed += 1;
    console.error(`✗ ${domain}: HTTP ${res.status}`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT, file), bytes);
  console.log(`✓ ${domain} → public/logos/${file} (${bytes.length} bytes)`);
}

process.exit(failed ? 1 : 0);
