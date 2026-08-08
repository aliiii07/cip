import Link from "next/link";
import { LogoMark, LogoSquare } from "@/components/Logo";
import { Eyebrow, GapMotif, Reveal, Slide, SlideNo } from "./primitives";
import { DECK_FOOTER, STAGE } from "@/lib/constants";

/* ---------------------------------------------------------------- 01 Hero */

const META = [
  ["Category", "Fintech · quantitative research"],
  ["Model", "Multi-agent LLM pipeline"],
  ["Stage", STAGE],
  ["Markets", "Stocks · Crypto · Forex"],
] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-[var(--gutter)] pb-16 pt-32">
      <div className="hero-rules" aria-hidden />

      <div className="deck-inner relative">
        <LogoMark className="mb-12 h-[68px] w-[86px] text-white md:mb-16" animate />

        <h1 className="hero-type max-w-[16ch]">
          Investing,
          <br />
          without
          <br />
          the fear.
        </h1>

        <p className="lead mt-8 max-w-[54ch]">
          CIP turns a simple choice into a tested, risk-managed strategy. Pick a
          market, an asset, a timeframe — four specialists do the rest.
          Paper-trading only, on real data.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/prototype" className="btn btn-primary">
            Try the prototype
          </Link>
          <Link href="/#contact" className="btn btn-ghost">
            Book a demo
          </Link>
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
            Capital Investment Prospects (CIP)
          </p>

          <div className="mt-12 space-y-6 text-[17px] leading-[1.68] text-[#2c2b28]">
            <p>
              CIP turns a plain-English trading idea — “buy the breakout when
              volume confirms” — into a backtested, risk-managed strategy. No
              code, no broker wiring, no market-microstructure expertise
              required.
            </p>
            <p>
              Input a hypothesis in ordinary language. Output a strictly-typed
              strategy, a full distribution of backtest results across realistic
              costs, and a risk report: built for retail investors and firms &amp;
              companies.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120} className="space-y-4">
          <div className="flex items-center justify-center bg-[#efeeea] px-8 py-14">
            <LogoSquare className="h-[168px] w-[168px]" />
          </div>

          <div className="bg-ink px-8 py-9 text-white">
            <div className="eyebrow">CIP</div>
            <ol className="mt-4 space-y-2 text-[15px] text-[#d8d8d8]">
              <li>01 — Natural language in</li>
              <li>02 — Backtested strategy out</li>
            </ol>
            <div className="my-7 h-[86px]">
              <Sparkline />
            </div>
            <p className="text-[13px] italic leading-relaxed text-muted">
              Fast access to news, data, unique insight and research tools —
              helping decision makers turn knowledge into action.
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
        <h2 className="display">The strategy that lies</h2>
      </Reveal>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
        <Reveal delay={80}>
          <div className="space-y-6 text-[17px] leading-[1.68] text-[#c6c6c6]">
            <p>
              Almost every retail strategy looks brilliant on a naive backtest.
              Then it loses money the moment it meets a real order book.
            </p>
            <p>
              Smoothed candles, mid-spread fills, cross-asset parameter reuse,
              in-sample-only metrics: four “death traps” quietly turn a +200%
              backtest into a −30% live result.
            </p>
            <p>
              Tools that catch these mistakes cost tens of thousands a year and
              demand a quant on staff. Everyone else flies blind.
            </p>
            <p className="text-white">
              Millions across Uzbekistan and beyond want to invest but fear
              charts they can’t read. CIP turns your idea into a tested,
              risk-managed strategy — opening the market to everyone.
            </p>
          </div>
        </Reveal>

        <Reveal delay={160} className="lg:pt-6">
          <GapMotif />
          <p className="mt-6 max-w-[34ch] text-[14px] text-muted">
            The gap between a naive backtest and live reality.
          </p>
          <hr className="rule mt-10" />
          <p className="mt-6 max-w-[38ch] text-[13px] leading-relaxed text-muted-2">
            Every one of those four traps is made structurally impossible in
            CIP. Not discouraged — impossible.
          </p>
        </Reveal>
      </div>
    </Slide>
  );
}

/* --------------------------------------------------------- 04 Positioning */

const BLOOMBERG = [
  "Manual — a cockpit you must learn to fly",
  "~$30,000 / year per terminal",
  "Built for institutions and pros",
  "Data & tools; you build the strategy",
];

const CIP_SIDE = [
  "Automatic — describe the idea in plain English",
  "A small fraction of the cost",
  "Built for retail, individuals, and investing firms",
  "A finished, risk-checked strategy",
];

export function Positioning() {
  return (
    <Slide id="positioning" n="04">
      <Reveal>
        <Eyebrow>Positioning — the next Bloomberg</Eyebrow>
        <h2 className="display mt-6">
          Bloomberg for <em className="font-normal italic">everyone</em>
        </h2>
        <p className="lead mt-6">
          Bloomberg gave professionals the data to decide manually. CIP does the
          analysis and the strategy work automatically — for everyone.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        <Reveal delay={80}>
          <div className="panel h-full">
            <div className="eyebrow">Bloomberg Terminal</div>
            <ul className="mt-7 space-y-4 text-[16px] text-[#9e9e9e]">
              {BLOOMBERG.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="panel panel-signal h-full">
            <div className="flex items-center gap-2.5">
              <span className="eyebrow">CIP</span>
              <span className="dot" />
            </div>
            <ul className="mt-7 space-y-4 text-[16px] text-white">
              {CIP_SIDE.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}

export { DECK_FOOTER };
