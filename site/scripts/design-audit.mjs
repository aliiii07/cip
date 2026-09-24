/**
 * Design audit.
 *
 * The Design Rules in CLAUDE.md say to measure contrast rather than judge it
 * by eye. This is the thing that measures it, so the rule is enforceable
 * instead of aspirational. Everything checked here is something a human, or a
 * model, reliably gets wrong by looking: a 4.35:1 grey on black looks fine.
 *
 * It renders the real pages in a real browser at both breakpoints and fails
 * the process on any violation, so it can gate a commit or a CI job.
 *
 *   node scripts/design-audit.mjs                    # localhost:3100, all routes
 *   node scripts/design-audit.mjs /prototype         # one route
 *   BASE=http://localhost:3000 node scripts/design-audit.mjs
 *
 * Playwright is not a dependency of this package, because it pulls a ~100MB
 * browser that nobody building the site needs. Run it through npx:
 *
 *   npx -y playwright@latest install chromium
 *   npx -y -p playwright@latest node scripts/design-audit.mjs
 */

const BASE = process.env.BASE ?? "http://localhost:3100";
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/about", "/legal"];
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright is not resolvable. Run:\n" +
      "  npx -y playwright@latest install chromium\n" +
      "  npx -y -p playwright@latest node scripts/design-audit.mjs"
  );
  process.exit(2);
}

/* ------------------------------------------------------ in-page collectors */

/**
 * Runs in the browser. Returns every violation it can see.
 *
 * Contrast is measured against the first opaque ancestor background rather
 * than the element's own, because almost every text node is transparent and
 * comparing a colour to `rgba(0,0,0,0)` silently passes everything.
 */
function collect() {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (s) => {
    const m = s.match(/[\d.]+/g).map(Number);
    return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]);
  };
  /** Cumulative opacity, since a dimmed ancestor dims the text inside it. */
  const effectiveOpacity = (el) => {
    let o = 1, n = el;
    while (n && n !== document.documentElement) {
      o *= parseFloat(getComputedStyle(n).opacity);
      n = n.parentElement;
    }
    return o;
  };
  /** What the eye receives when translucent text sits on a backdrop. */
  const blend = (fg, bg, a) => {
    const f = fg.match(/[\d.]+/g).map(Number), b = bg.match(/[\d.]+/g).map(Number);
    return `rgb(${f.slice(0,3).map((v,i)=>Math.round(v*a + b[i]*(1-a))).join(", ")})`;
  };
  const backdrop = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || "rgb(255, 255, 255)";
  };

  const out = { contrast: [], overflowX: 0, copy: [], alt: [] };

  out.overflowX = document.documentElement.scrollWidth - window.innerWidth;

  // --- contrast -----------------------------------------------------------
  const seen = new Set();
  document.querySelectorAll("*").forEach((el) => {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Below this it is a reveal that has not run, not a contrast decision.
    const alpha = effectiveOpacity(el);
    if (alpha < 0.2) return;

    const size = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight;
    const bg = backdrop(el);
    // Translucent text is not the colour it declares. Dimming an element to
    // 45% is a contrast change, and reporting the declared colour hides it.
    const fg = alpha < 0.99 ? blend(cs.color, bg, alpha) : cs.color;
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = +((hi + 0.05) / (lo + 0.05)).toFixed(2);
    // WCAG "large text": 24px, or 18.66px at 700+.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (ratio >= need) return;

    const key = fg + size + bg;
    if (seen.has(key)) return;
    seen.add(key);
    out.contrast.push({ ratio, need, size, weight, color: fg, dimmed: alpha < 0.99 ? +alpha.toFixed(2) : null, bg, text: own.slice(0, 52) });
  });

  // --- banned copy --------------------------------------------------------
  // Dashes and the generated-prose tells, both banned in the Design Rules.
  // Checked in the DOM rather than the source so it also catches copy that
  // arrives from data files or props.
  const TELLS = /\b(unlock|seamless(ly)?|elevate|empower(ing)?|in today's fast-paced world)\b/gi;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent;
    if (!t.trim()) continue;
    if (n.parentElement?.closest("script,style")) continue;
    if (/[–—]/.test(t)) {
      out.copy.push({ kind: "dash", text: t.trim().slice(0, 64) });
    }
    const hit = t.match(TELLS);
    if (hit) out.copy.push({ kind: hit[0].toLowerCase(), text: t.trim().slice(0, 64) });
  }

  // --- images -------------------------------------------------------------
  document.querySelectorAll("img").forEach((img) => {
    if (img.getAttribute("alt") === null) out.alt.push(img.currentSrc || img.src);
  });

  return out;
}

/* ---------------------------------------------------------------- reporting */

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

let failures = 0;

const browser = await chromium.launch();

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

    await page.goto(BASE + route, { waitUntil: "networkidle" });
    // Scroll the whole page so anything gated on IntersectionObserver reveals
    // itself; a reveal still at opacity 0 is not measurable.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 25));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const r = await page.evaluate(collect);
    const problems = [];

    r.contrast
      .sort((a, b) => a.ratio - b.ratio)
      .forEach((c) =>
        problems.push(
          `contrast ${RED(c.ratio + ":1")} needs ${c.need}  ${c.size}px/${c.weight}  ${c.color} on ${c.bg}` +
            (c.dimmed ? DIM(`  (opacity ${c.dimmed})`) : "") + "\n" +
            DIM(`            "${c.text}"`)
        )
      );
    if (r.overflowX > 0) problems.push(`overflow-x ${RED(r.overflowX + "px")} of horizontal scroll`);
    r.copy.forEach((c) => problems.push(`copy ${RED(c.kind)}  ${DIM('"' + c.text + '"')}`));
    r.alt.forEach((s) => problems.push(`img missing alt attribute  ${DIM(s)}`));
    consoleErrors.forEach((e) => problems.push(`console ${RED("error")}  ${DIM(e.slice(0, 100))}`));

    /**
     * Keyboard focus, walked for real.
     *
     * `:focus-visible` rules are invisible to getComputedStyle on a resting
     * element, so a static read reports every styled link as unfocusable and
     * the check becomes noise you learn to ignore. Pressing Tab is the only
     * way to observe the state a keyboard user actually gets.
     */
    const naked = new Set();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const hit = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outlined = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const shadowed = cs.boxShadow && cs.boxShadow !== "none";
        const ringed = cs.textDecorationLine !== "none" || parseFloat(cs.borderWidth) > 0;
        if (outlined || shadowed || ringed) return null;
        const name = el.tagName.toLowerCase();
        return name + (el.textContent ? ` "${el.textContent.trim().slice(0, 26)}"` : "");
      });
      if (hit) naked.add(hit);
    }
    naked.forEach((s) => problems.push(`focus ${RED("no visible indicator")} on Tab  ${DIM(s)}`));

    // reduced motion must land on the settled end state, not a faster animation
    await ctx.close();
    const rm = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const rmPage = await rm.newPage();
    await rmPage.goto(BASE + route, { waitUntil: "networkidle" });
    await rmPage.waitForTimeout(400);
    const stuck = await rmPage.evaluate(() => {
      // Anything below the fold that is still transparent under reduced
      // motion never arrives, because the reveal never runs.
      return [...document.querySelectorAll("h1,h2,h3,p,li,img")].filter((el) => {
        const cs = getComputedStyle(el);
        // Only a reveal that never ran. Deliberate dimming is a contrast
        // question, and the contrast check already accounts for it.
        return +cs.opacity < 0.2 && el.getBoundingClientRect().height > 0;
      }).length;
    });
    if (stuck > 0) problems.push(`reduced-motion ${RED(stuck + " elements")} never revealed`);
    await rm.close();

    const label = `${route}  @${vp.name}px`;
    if (problems.length === 0) {
      console.log(`  ${BOLD("PASS")}  ${label}`);
    } else {
      failures += problems.length;
      console.log(`  ${RED("FAIL")}  ${BOLD(label)}`);
      problems.forEach((p) => console.log(`        ${p}`));
    }
  }
}

await browser.close();

console.log();
if (failures) {
  console.log(RED(`${failures} violation${failures === 1 ? "" : "s"}.`) + " See the Design rules in CLAUDE.md.");
  process.exit(1);
}
console.log("No violations.");
