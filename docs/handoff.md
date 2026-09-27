# CIP handoff — shared Cursor + Claude Code state

Update this file before leaving a tired session. The other tool starts by reading `AGENTS.md` (or `CLAUDE.md`) and this file. Chats do not sync.

**Last updated:** 2026-09-27 (late) — research built for all 50 companies (PR #16), the MVP pager fixed so one trackpad swipe turns one page (PR #17, stacked on #16), and page 3 rebuilt as "Uzbek Companies, coming soon" with page 4 removed (PR #18, stacked on #17). Merge order #16, #17, #18; the user picks the page 3 variant. See "Just finished".

## Product

CIP = **Capital Investment Prospects**. Do not expand the acronym in repo docs, UI, or marketing. Describe the product as a quant research sandbox / paper-trading simulation tool. Language rules in `AGENTS.md` / `CLAUDE.md` still apply (no profit/return promises).

Local SQLite: `data/cip.db` (gitignored). Same file on this machine for both tools.

## Current git (this machine)

- Branches, stacked: `feat/claude/mvp-companies` (PR #16, research page + all 50 data files) → `feat/claude/mvp-scroll` (PR #17, one swipe one page) → `feat/claude/mvp-uzbek` (PR #18, page 3 coming soon, 3 pages). Each PR targets `main` and shows the commits below it until the one under it merges. None is merged by Claude; the user merges. Vercel deploys `main` to netcip.com (GitHub integration, `vercel[bot]` builds every push).
- 2026-09-27: the user's dev server on `:3100` was broken by a plain `next build` (see the build note under "Just finished") and needs `Ctrl-C` then `cd site && npm run dev` again.
- Still untracked on purpose: `docs/cip-landing-master-prompt.{html,pdf}`, `docs/parrot-parity-landing-prompt.md`, `.cursor/` (the user's own prompt files, not part of the site).
- `git pull --rebase origin main` before new work
- Workflow: `feat/name/topic`, never commit to `main`, never force-push shared branches

## Build state (from Claude project memory + later git)

Phased web platform on FastAPI `api/` + SSE and Next.js `frontend/`. Master build prompt v3 (chat-only) used warm tokens (bg `#F2F1EE`, accent `#C07B3A`, Inter + JetBrains Mono, sentence case). Later work on this branch moved the prototype toward a Georgia / terminal treatment — **match the current frontend, not the old v3 palette, unless the user says otherwise.**

| Phase | Status (last known) |
| --- | --- |
| P0 scaffold / ADRs | Shipped — PR #1 `feat/claude/web-platform` |
| P1 API + SQLite + SSE | Shipped — PR #2 `feat/claude/p1-api-sse` |
| P2 frontend shell | Shipped — PR #3 `feat/claude/p2-frontend` |
| P3 hero (search + `/asset/[symbol]` + Binance) | Hero shipped — PR #4 `feat/claude/p3-hero`. Remaining P3: vectorbt engine + Monte Carlo perf gate |
| P4–P8 | Screener/scanner, variant lab, decisions/paper fills, monitor, hardening — not done as a named phase |

Live checks when last recorded: BTCUSDT/SOLUSDT via Binance. Equities/FX stay stub until `POLYGON_API_KEY`. API `:8000` (`.claude/launch.json` `api`), web `:3000` (`web`).

## Decisions to keep

- Disclaimer string is **schema-pinned**. Do not swap in a longer marketing variant.
- Factual analysis over machine-generated TA commentary for now (no Chart Brief one-liners / signal prose unless the user asks).
- Expectancy is the headline metric; never lead with win rate alone.
- Simulated numbers badged SIMULATED/PAPER. Wording: "Paper session · live data".
- Paper trading only. No live brokerage or exchange execution.
- Variant lab reject reasons: `overfitting`, `high_drawdown`, `weak_consistency`, `too_few_trades`, `bad_risk_reward`.
- Confidence: `0.4·expectancy_percentile + 0.3·robustness_pass_rate + 0.3·(1−|train−validate|/max(train,ε))`.
- MC perf gate: 5,000 iterations under 10s. MVP variant cap 512.
- No reference-post branding (@seb.ai, MIROFISH, Girsta, "Fable 5 AI Trader").
- User said not to pause between phases unless they stop you.

## Open questions (do not guess)

- Polygon / CoinGecko Pro keys?
- Hosting for the backend (`api/`, `frontend/`) is still open. The marketing site + MVP (`site/`) is settled: Vercel project "cip", GitHub integration on `aliiii07/cip`, production follows `main`, every push gets a preview, functions in `fra1` (`site/vercel.json`).
- Single-user MVP or not?

## How to switch tools

1. Write what you just did and what is next in **Current git** and a short "Just finished / Next" note below.
2. Save files. Commit only if the user asked.
3. Open `/Users/macbook2air/Developer/cip` in the other tool.
4. New chat: read `AGENTS.md` and `docs/handoff.md`, then continue.

### Just finished

- **parrotfinance.io clone as the `site/` homepage** (user's explicit call: exact replica, colors and copy, to be rebranded by hand later). First attempt followed a pasted spec that described Parrot *Protocol* (Solana DeFi); the user corrected with screenshots of the real parrotfinance.io (black/white/lime investing app), and the page was rebuilt to match those. Files: `site/app/page.tsx` (replaced), `site/components/parrot/*` (Navbar, Hero w/ Shark Tank badge + arc + money art, HowItWorks pinned sequence, PhoneFrames (DOM iPhone mockups: SPY chart w/ Webull/Public/Alpaca chips, Auto Invest list, Webull brokerage pie), AccessCubes (isometric fund-logo cubes), Security (extruded boards), GrowthCalculator (collage + spring totals), Faq, Band, Footer x2, ParrotLogo, BrandMarks), `site/lib/parrot-content.ts` (**every** string, figure and brand name, copied from the live site — the single rebrand swap point), `parrot.*` tokens in `site/tailwind.config.ts` (lime `#B2F200`, dark `#1F1F1F`, black `#0A0A0A`), `pf-*` classes in `site/app/globals.css`, `lucide-react` added. Third-party logos (State Street, Fidelity, Vanguard, BlackRock, Bitwise, VanEck, Webull, Public, Alpaca) are typographic wordmarks in brand colors, not copied artwork.
- **Landing rebranded to CIP, iterated with the user, declared finished.** All copy lives in `site/lib/parrot-content.ts`: Techstars badge, nav (Partner with Us / Sign up / Log in / Launch CIP), hero "Easy Investing, Backed by Real Research" with the drawn money pile and a measured arc (60px+ text clearance at 1440/1024/768/390), How It Works (4 CIP steps + 4 CIP phone screens), cubes section (6 of the 50 NASDAQ names with official logos from Logo.dev: `npm run logos` in `site/`, key `LOGO_DEV_TOKEN` in gitignored `site/.env`), "No Hype. Just Homework, Done Right." three boards, calculator at 27.65%, new FAQ, footer `corporation@netcip.com`. Zigzag CIP mark (`ParrotLogo.tsx` `CipMark`, lime dot `#C6F04A`) with draw-on animation, full favicon set in `site/public/`. `/partner` (mailto form) and `/login` (placeholder) pages exist. No dashes anywhere in site copy (user rule).
- **Still not deployable as-is:** the calculator keeps fund names and return figures (BlackRock 27.65%, VanEck, Fidelity, State Street) and the footer lists Form CRS / Form ADV. Those need real CIP disclosures or removal.
- **MVP page rebuilt** (`site/app/prototype`, the target of every Launch button). Old flow deleted: category cards, Analyze, terminal panels, `components/terminal/*` (recoverable from git; `lib/analysis.ts`, `montecarlo.ts`, `marketData.ts` and `app/api/analyze/route.ts` are kept as engine code for page 2). New: thin fixed dark header (`components/mvp/AppHeader.tsx`), two screen tall snap pages with one gesture per page, lock during the 600ms slide, arrows/PageUp/PageDown, touch swipe, dot indicator with "1 / 2" that adapts to the page tone, instant under reduced motion (`SnapPages.tsx`); page 1 is the NASDAQ 50 treemap on the landing's white grid (`pf-grid-light bg-white`, text `#1a1a1a` / `#4a4a4a` / `#71717A`) (`NasdaqHeatmap.tsx`, pure layout in `lib/treemap.ts` + `lib/heatmap.ts`); page 2 is empty and dark on purpose. The 50 tickers, the display names and the 7 groups (6 sectors + "Other" for HOOD, LIN, EQIX, CEG) are the user's list in `lib/nasdaq50.ts`; names shown are from that file, numbers are the feed's. Every tile always shows its ticker: font floor 8px desktop / 7px mobile, tall narrow tiles rotate it, and the treemap enforces a minimum row thickness and tile length (`minTile`, 24px desktop / 17px mobile) so a giant beside a tiny company (SPCX next to ADP) cannot leave a sliver. Data: `app/api/quotes/route.ts` → `lib/quotes.ts` → Yahoo Finance quote endpoint (cookie + crumb, keyless), 30s server cache, last good set served as `stale` for 10 min, then 502 and the page shows "Data unavailable, retrying". A ticker the feed does not return is listed on the page in the status line ("No feed data for …"), never silently dropped. No sample data on this page at all. As of 2026-09-26 Yahoo returns all 50, including SPCX and SKHY.
- Gotchas: `tailwind.config.ts` changes need a dev-server restart. Yahoo's crumb endpoint returns 429 to a browser-like User-Agent but 200 to the plain `Mozilla/5.0 (compatible; CIP-research/1.0)` the project already sends. The site server on `:3100` is run by the user (`cd site && npm run dev`); do not start a second one. `next lint` is not configured in `site/` (no eslint config); `tsc --noEmit` and `scripts/design-audit.mjs` are the checks (audit needs playwright resolvable from `site/`, e.g. a temporary `node_modules/playwright` symlink to the npx cache).

- **2026-09-27, branch `feat/claude/mvp-companies` (PR open, not merged):** the MVP is now four snap pages: page 1 "International Companies" (50 logo tiles from Logo.dev at `public/logos/marks/`, drifting, `components/mvp/Companies.tsx`), page 2 the heatmap, pages 3 and 4 empty. Clicking a tile opens **`/prototype/<ticker>`**, the company research page (`app/prototype/[ticker]`, `components/research/*`): header card with live price, sticky tab bar, Summary (Lightweight Charts line + Quick Review), then Chart (old terminal `ChartAnalysis`), Probabilities (bootstrap of 5 years of daily returns, 5,000 paths, reusing `ProbabilityLattice`/`TailRidge`, plus the existing backtest engine via `/api/backtest`), Financials, Ratios and peers, Segments, Earnings quality, Balance sheet, Risk, Audit. Pages are static from `site/data/companies/<TICKER>.json`; prices, chart and backtest are live (`/api/quotes`, `/api/candles`, `/api/backtest`).
- **Supplied annual reports (2026-09-27):** the user put one PDF per company in `~/Downloads/AyuGram Desktop/Data 2` (10-Ks, 20-Fs, SpaceX's 424B4 prospectus, SK hynix's F-1). `scripts/research/reports.ts` reads them with `scripts/research/pdf_blocks.py` (PyMuPDF, installed with `pip3 install --user pymupdf`; falls back to `pdftotext`), so bold headings become their own blocks; text is cached in `site/data/reports/` (gitignored). Used for prose only (what it does, risk factors, legal, audit); numbers stay XBRL only. Companies with no annual report yet (SPCX, SKHY) get quarterly columns when XBRL has them and "Not enough history" chips. `CIP_REPORTS_DIR` in `.env` overrides the folder.
- **Quick review (2026-09-27 rework):** identity line quoted from the report, six key numbers, then money / track record / financial health / against peers on the left and what can go wrong / big moments / what's coming on the right; 150 word budget trims moments before risks. All page numbers are set in Figtree (no mono) per the user; canvases and charts resolve the site face via `siteFont()` in `lib/motion.ts`.
- **Research pipeline:** `cd site && npm run research AAPL` (or `AAPL,ASML`, `all`, `check` for newer filings, `--table` for 15 numbers). `scripts/research/*` fetches SEC EDGAR (companyfacts, submissions, the annual report text, the XBRL instance + labels for segments), Yahoo prices/calendar, computes every number in code (`lib/verdicts.ts` holds every chip rule), writes the words (Claude if `ANTHROPIC_API_KEY` is set in `site/.env`, else fixed templates from the same facts), then a checker verifies every number and date in every sentence and drops what fails. **No `ANTHROPIC_API_KEY` exists in `site/.env` yet**, so all text is template written. Built so far, all with 0 dropped sentences: AAPL (10-K, 8/8 quick review blocks, verified), ASML (20-F, IFRS, 8/8, audit section from the supplied PDF), SPCX (424B4, quarterly columns, 6/8, no segments or earnings quality), SKHY (F-1, text only, 3/8). Tooltips are native `title` attributes for now, not shadcn.
- **All 50 companies built (2026-09-27, PR #16):** `npm run research all` took about 50 minutes (EDGAR is throttled). Every file verified with 0 dropped sentences after fixes the run exposed: fiscal years are collected across every revenue tag (NVIDIA, Alphabet and Shopify moved tags and had been read four years stale), IFRS "sale of goods" revenue (Sanofi), label entities decoded, parent members removed from segment axes (NVIDIA, Palo Alto, ADP, Microsoft), the money line trimmed to 20 words, "$0" matching a zero fact. Sections still missing where the source lacks them: AMAT and MSFT risk factors, CRWD and STX segments, LIN audit, SNY segments and risk factors, SKHY statements (F-1 only), SPCX segments and earnings quality. Known weak line: MSFT's money line uses fallback member names ("Microsoft Three Six Five", "Linked In Corporation") because its label linkbase did not resolve those members.
- **Pager scroll (2026-09-27, PR #17):** `components/mvp/SnapPages.tsx` accumulates wheel travel per gesture (gap 150 ms) and pages at 40 px, ignores the rest of the gesture (the inertia tail), starts a new gesture when deltas rise out of a decayed tail, pages at once on a mouse notch (50 px or a line based wheel), locks only during the 500 ms slide, lets inner scrollable content scroll first, adds Space and Shift+Space. Constants at the top of that file. Lenis is skipped under `/prototype` (`components/motion/SmoothScroll.tsx`), so the company page scrolls natively; the tab bar glide uses instant scroll steps. Test harness: scratchpad `scroll-diag.mjs` (dispatches trackpad shaped wheel sequences in page at 16 ms).
- **Page 3 (2026-09-27, PR #18):** `components/mvp/UzbekCompanies.tsx` + `.module.css`. Title block identical to page 1, girih pattern drawn in once (stroke-dashoffset), lime light roaming via a masked window that moves while its content counter moves, 8 frosted tiles (4 on phones), "Coming Soon" shimmer by the same trick, "Tez orada", one line, no button (the `/login` page is a placeholder, not a sign up). `VARIANT` constant "A" (white lines + lime) or "B" (adds a soft turquoise glow); currently "A", the user picks. Animations pause off screen via `animation-play-state`; reduced motion shows the settled state. Page 4 removed from `app/prototype/page.tsx`; nothing else referenced it.
- **Builds while a dev server runs:** always `NEXT_DIST_DIR=.next-build npm run build`. A plain `next build` empties `.next` under the running `next dev`, which then serves 500s ("Cannot find module ./vendor-chunks/...") until it is restarted. A second dev server for checks goes on another port with its own dir: `NEXT_DIST_DIR=.next-verify npx next dev --port 3101` (`.claude/launch.json` entry `site-verify`).

### Next

- User merges #16, then #17, then #18 (after picking page 3 variant A or B; flip `VARIANT` in `UzbekCompanies.tsx` and delete the other branch of the constant once chosen).
- Microsoft's segment labels: resolve the custom members in its label linkbase (or map them by hand) so the money line reads "Microsoft 365 Commercial" and "LinkedIn"; rerun `npm run research MSFT`.
- `npm run research check` periodically for newer filings; a company whose latest 10-K or 20-F arrives needs a rerun.
- Add `ANTHROPIC_API_KEY` to `site/.env` (and Vercel) so the Quick Review is model written; the checker and fallback stay.
- SKHY's identity line is weak ("We offer traditional DRAMs...") because the F-1 has no plain "SK hynix is a..." sentence; ASML's glossy report yields fewer bold risk headings than a 10-K. Both are template limits, not data errors.
- Decide whether `/prototype` should be renamed (the URL still says prototype; changing it means editing the two hrefs in `parrot-content.ts`).
- Landing: replace or remove the fund figures in the calculator and the Form CRS / ADV footer links before any deploy.
- Backend: remaining P3 (vectorbt engine + Monte Carlo perf gate) is still open.
