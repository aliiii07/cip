import Link from "next/link";
import { LogoMark, LogoSquare } from "@/components/Logo";
import { Eyebrow, GapMotif, Reveal, Slide, SlideNo } from "./primitives";
import { AmbientField } from "./AmbientField";
import { Magnetic } from "./Magnetic";
import { ScrollParallax } from "./ScrollParallax";
import { DECK_FOOTER, STAGE } from "@/lib/constants";

/* ---------------------------------------------------------------- 01 Hero */

const META = [
  ["Category", "Fintech · verified investing"],
  ["Core", "Verification before anything reaches you"],
  ["Stage", STAGE],
  ["Markets", "Stocks · Crypto · Forex"],
] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-[var(--gutter)] pb-16 pt-32">
      <AmbientField className="opacity-70" />
      <ScrollParallax className="parallax-slow">
        <div className="hero-rules" aria-hidden />
      </ScrollParallax>

      <div className="deck-inner relative">
        <LogoMark
          className="mb-12 h-[68px] w-[86px] text-white md:mb-16"
          animate
        />

        <h1 className="hero-type max-w-[19ch]">
          Follow the proven,
          <br />
          not just the famous.
        </h1>

        <p className="lead mt-8 max-w-[56ch]">
          Build your own strategy or follow an expert. Nothing reaches you
          untested: every strategy passes the same verification first, on
          paper, with real data.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Magnetic strength={14}>
            <Link href="/prototype" className="btn btn-hero">
              Try the prototype
            </Link>
          </Magnetic>
        </div>

        <hr className="rule mt-16 max-w-[46rem]" />

        <dl className="mt-7 grid max-w-[46rem] gap-y-3">
          {META.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] items-baseline gap-4">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-[14px] text-[#d4d4d4]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="slide-no absolute bottom-7 right-[var(--gutter)] hidden tracking-[0.24em] md:block">
        President Tech Award
      </div>
      <SlideNo n="01" />
    </section>
  );
}

/* --------------------------------------------------------------- 02 About */

export function About() {
  return (
    <Slide id="about" n="02" tone="paper">
      <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <Reveal>
          <h2 className="display">About us</h2>
          <p className="mt-5 text-[15px] text-[#6e6c66]">
            Capital Investment Prospects (C.I.P)
          </p>

          <div className="mt-12 space-y-6 text-[17px] leading-[1.68] text-[#2c2b28]">
            <p>
              C.I.P lets everyday people invest the way professionals do. Follow
              the strategies of top investors and funds, build your own with
              AI, or do both.
            </p>
            <p>
              What separates C.I.P from every copy-trading app is verification.
              Nothing reaches you until C.I.P has checked it with data,
              research, backtesting and an AI risk review.
            </p>
            <p className="text-[#1c1b19]">
              Following is building you did not have to do yourself. Building
              is following you kept editing. Both run through the same engine.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120} className="space-y-4">
          <ScrollParallax className="parallax-slow flex items-center justify-center bg-[#efeeea] px-8 py-14">
            <LogoSquare className="h-[168px] w-[168px] idle-bob" />
          </ScrollParallax>

          <div className="pointer-glow bg-ink px-8 py-9 text-white">
            <div className="eyebrow">C.I.P</div>
            <ol className="mt-4 space-y-2 text-[15px] text-[#d8d8d8]">
              <li>01 · An expert moves, or you build</li>
              <li>02 · C.I.P verifies it</li>
              <li>03 · Only what passes reaches you</li>
            </ol>
            <div className="my-7 h-[86px]">
              <Sparkline />
            </div>
            <p className="text-[13px] italic leading-relaxed text-muted">
              We combine human experts with machine verification.
            </p>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}

/** Decorative candle run for the About tile. Shape only — no data is implied. */
function Sparkline() {
  const bars = [
    18, 26, 14, 32, 22, 40, 28, 46, 34, 52, 30, 58, 44, 66, 50, 74, 60, 82, 68,
    90,
  ];
  return (
    <div className="flex h-full items-end gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${h}%`,
            background:
              i === bars.length - 1
                ? "var(--signal)"
                : `rgba(255,255,255,${0.1 + (i / bars.length) * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- 03 Problem */

export function Problem() {
  return (
    <Slide id="problem" n="03">
      <Reveal>
        <h2 className="display">Following on blind faith</h2>
      </Reveal>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
        <Reveal delay={80}>
          <div className="space-y-6 text-[17px] leading-[1.68] text-[#c6c6c6]">
            <p>
              <strong className="font-semibold text-white">Access.</strong>{" "}
              The best strategies have always been reserved for the wealthy.
            </p>
            <p>
              <strong className="font-semibold text-white">
                Blind trust.
              </strong>{" "}
              Copy-trading apps let people follow experts on faith, with real
              money, and mostly only inside the United States.
            </p>
            <p>
              <strong className="font-semibold text-white">
                No judgement.
              </strong>{" "}
              A beginner cannot tell a genuinely good strategy from a lucky
              one.
            </p>
            <p className="text-white">
              <strong className="font-semibold">No proof.</strong> No tool
              checks whether an expert’s move actually holds up before you
              copy it. That gap is the whole reason C.I.P exists.
            </p>
          </div>
        </Reveal>

        <Reveal delay={160} className="lg:pt-6">
          <ScrollParallax className="parallax-slow">
            <GapMotif />
          </ScrollParallax>
          <p className="mt-6 max-w-[34ch] text-[14px] text-muted">
            The gap between a claim and a checked claim.
          </p>
          <hr className="rule mt-10" />
          <p className="mt-6 max-w-[38ch] text-[13px] leading-relaxed text-muted-2">
            Closing it is the product. Nothing reaches a user without passing
            verification first.
          </p>
        </Reveal>
      </div>
    </Slide>
  );
}

/* --------------------------------------------------------- 04 Positioning */

/**
 * The comparison rows come straight from the deck's own table, kept as
 * matched pairs so each claim about a copy-trading app sits directly beside
 * what CIP does instead. Stated as capability differences, never as a claim
 * about anyone's results.
 */
const COMPARISON: [string, string][] = [
  ["Follows experts", "Follows experts"],
  ["Does not verify the strategy first", "Verifies every strategy first"],
  ["No warning when an expert's move fails a test", "Warns when a move fails the test"],
  ["Real money from day one", "Paper first, no real-money risk now"],
  ["Needs a US brokerage", "No brokerage needed in paper mode"],
  ["Does not serve emerging markets", "Built for Uzbekistan and emerging markets"],
  ["Follow the famous", "Follow the proven"],
];

export function Positioning() {
  return (
    <Slide id="positioning" n="04">
      <Reveal>
        <Eyebrow>Positioning</Eyebrow>
        <h2 className="display mt-6">
          Follow the <em className="font-normal italic">proven</em>
        </h2>
        <p className="lead mt-6">
          Copy-trading put expert portfolios within reach and asked you to
          take them on faith. C.I.P checks the move before it reaches you.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        <Reveal delay={80}>
          <ScrollParallax className="parallax-slow panel pointer-glow h-full">
            <div className="eyebrow">Copy-trading apps today</div>
            <ul className="mt-7 space-y-4 text-[16px] text-[#9e9e9e]">
              {COMPARISON.map(([them]) => (
                <li key={them}>{them}</li>
              ))}
            </ul>
          </ScrollParallax>
        </Reveal>

        <Reveal delay={160}>
          <ScrollParallax className="parallax-slow-rev panel panel-signal pointer-glow h-full">
            <div className="flex items-center gap-2.5">
              <span className="eyebrow">C.I.P</span>
              <span className="dot" />
            </div>
            <ul className="mt-7 space-y-4 text-[16px] text-white">
              {COMPARISON.map(([, us]) => (
                <li key={us}>{us}</li>
              ))}
            </ul>
          </ScrollParallax>
        </Reveal>
      </div>
    </Slide>
  );
}

export { DECK_FOOTER };
