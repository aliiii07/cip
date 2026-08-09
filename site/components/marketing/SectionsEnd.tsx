import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Eyebrow, Reveal, Slide, SlideNo } from "./primitives";
import { WaitlistForm } from "./ContactForms";
import { ScrollParallax } from "./ScrollParallax";
import { STAGE } from "@/lib/constants";

/* ------------------------------------------------------------- 10 Roadmap */

const NEXT = [
  ["P4", "Screener & scanner", "Rank markets by volume, volatility, trend and momentum into watchlists."],
  ["P5", "Variant lab", "Generate strategy variants with explicit reject reasons and a confidence score."],
  ["P6", "Decision memos", "Bull / bear / key-unknown reports and simulated paper fills."],
  ["P7", "Monitor", "Bar-close radar with a live stage wheel and alerts."],
  ["P8", "Hardening", "Banned-terms CI, gate-immutability tests, security pass."],
] as const;

export function Roadmap() {
  return (
    <Slide n="10" tone="paper">
      <Reveal>
        <h2 className="display">What’s next</h2>
        <p className="mt-5 max-w-[60ch] text-[17px] text-[#57554f]">
          From a working sandbox to a full research platform: the same
          discipline, more surface area.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {NEXT.map(([p, title, body], i) => (
          <Reveal key={p} delay={i * 70}>
            <div className="card-lift pointer-glow h-full border border-[#e2e0da] bg-white p-6">
              <div
                className="text-[30px] leading-none"
                style={{ color: i === 0 ? "var(--signal)" : "#c9c7c1" }}
              >
                {p}
              </div>
              <h3 className="mt-6 text-[16px] font-semibold text-[#1c1b19]">
                {title}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.58] text-[#57554f]">
                {body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={400}>
        <div className="mt-8 flex items-center justify-between text-[13px]">
          <span className="text-signal">Now</span>
          <span className="tracking-[0.16em] text-[#8b8983]">Post-seed →</span>
        </div>
      </Reveal>
    </Slide>
  );
}

/* -------------------------------------------------------------- 11 Vision */

export function Vision() {
  return (
    <Slide n="11">
      <div className="grid items-center gap-16 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal>
          <Eyebrow>Our vision</Eyebrow>
          <h2 className="display mt-7 max-w-[16ch]">
            The platform to success in trading.
          </h2>
          <p className="lead mt-12">
            Bloomberg brought transparency to institutions for forty years.
            The next leap isn’t more data for the few. It’s honest, automated
            research for the millions never let in.
          </p>
          <p className="mt-10 text-[clamp(1.25rem,2.4vw,2rem)] italic">
            Younger. Simpler. Cheaper.{" "}
            <span style={{ color: "var(--signal)" }}>Automatic.</span>
          </p>
        </Reveal>

        <Reveal delay={160} className="hidden justify-center lg:flex">
          <ScrollParallax className="parallax-slow">
            <LogoMark className="idle-bob h-[190px] w-[240px] text-white" />
          </ScrollParallax>
        </Reveal>
      </div>
    </Slide>
  );
}

/* ----------------------------------------------------------------- 12 CTA */

const CLOSING_META = [
  ["Category", "Fintech · quantitative research"],
  ["Stage", STAGE],
  ["Ask", "President Tech Award: build the next Bloomberg"],
] as const;

export function FinalCta() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden px-[var(--gutter)] py-28 md:py-36"
    >
      <div className="deck-inner">
        <Reveal className="flex flex-col items-center text-center">
          <ScrollParallax className="parallax-slow">
            <LogoMark className="idle-bob h-[76px] w-[96px] text-white" />
          </ScrollParallax>
          <h2 className="display mt-12">Capital Investment Prospects</h2>
          <p className="lead mt-6 text-center">
            Younger, simpler and cheaper than Bloomberg, and automatic instead
            of manual.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <hr className="rule mx-auto mt-14 max-w-[34rem]" />
          <dl className="mx-auto mt-8 grid max-w-[34rem] gap-y-3">
            {CLOSING_META.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[6.5rem_1fr] items-baseline gap-5 sm:grid-cols-[8rem_1fr]"
              >
                <dt className="eyebrow text-right">{k}</dt>
                <dd className="text-[14px] text-[#d4d4d4]">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={200}>
          <div className="mx-auto mt-16 max-w-[30rem] border-t border-hairline pt-12">
            <WaitlistForm />
          </div>
        </Reveal>

        <Reveal delay={280}>
          <p className="mt-14 text-center text-[13.5px] text-muted">
            Want to see it work first?{" "}
            <Link href="/prototype" className="text-white underline underline-offset-4">
              Run the prototype
            </Link>{" "}
            and pick an asset to watch the four agents.
          </p>
        </Reveal>
      </div>

      <SlideNo n="12" />
    </section>
  );
}
