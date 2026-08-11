import { LogoMark } from "@/components/Logo";
import { CountUp, Eyebrow, Reveal, Slide } from "./primitives";

/* ---------------------------------------------------------- 05 What we do */

const WHAT = [
  [
    "Pick & go",
    "Select an asset and a timeframe. CIP builds and tests the strategy.",
  ],
  [
    "Automated pipeline",
    "Four specialised agents research, design, backtest and stress-test it end to end.",
  ],
  [
    "Risk-managed output",
    "A strictly-typed strategy, the full distribution of results, and a plain-language risk report.",
  ],
] as const;

export function WhatWeDo() {
  return (
    <section id="what-we-do" className="relative grid lg:grid-cols-2">
      {/* Left: the mark, alone on black — as on the deck. */}
      <div className="flex items-center justify-center bg-ink px-[var(--gutter)] py-24 lg:py-0">
        <Reveal>
          <LogoMark className="h-[120px] w-[150px] text-white md:h-[180px] md:w-[225px]" />
        </Reveal>
      </div>

      {/* Right: inverted to paper. */}
      <div className="on-paper flex items-center px-[var(--gutter)] py-24 lg:py-32">
        <div className="w-full max-w-[40rem]">
          <Reveal>
            <h2 className="display text-right">What we do</h2>
          </Reveal>

          <dl className="mt-16 space-y-11">
            {WHAT.map(([label, body], i) => (
              <Reveal key={label} delay={i * 90}>
                <div className="grid gap-3 sm:grid-cols-[11rem_1fr] sm:gap-8">
                  <dt className="eyebrow pt-1">{label}</dt>
                  <dd className="text-[17px] leading-[1.6] text-[#2c2b28]">
                    {body}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 06 Pipeline */

const AGENTS = [
  [
    "01",
    "Market Scout",
    "Pulls price, order-book flow, and news / sentiment for the asset.",
  ],
  [
    "02",
    "Strategy Architect",
    "Compiles the setup into a strictly-typed strategy, never raw code.",
  ],
  [
    "03",
    "Backtest Engine",
    "Runs it on point-in-time data with realistic fills, fees and slippage.",
  ],
  [
    "04",
    "Risk Cop",
    "5,000-permutation Monte Carlo. On a breach, loops back for correction.",
  ],
] as const;

export function Pipeline() {
  return (
    <Slide id="pipeline" n="06" tone="paper">
      <Reveal>
        <h2 className="display">The four-agent loop</h2>
        <p className="mt-5 max-w-[62ch] text-[17px] text-[#57554f]">
          A fixed LangGraph sequence. Every strategy passes through all four,
          none skippable.
        </p>
      </Reveal>

      <div className="mt-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {AGENTS.map(([n, name, body], i) => (
            <Reveal key={n} delay={i * 80}>
              <div className="card-lift pointer-glow relative h-full border border-[#e2e0da] bg-white p-7">
                <div
                  className="text-[34px] leading-none tracking-tight transition-colors duration-300"
                  style={{ color: i === 3 ? "var(--signal)" : "#c9c7c1" }}
                >
                  {n}
                </div>
                <h3 className="mt-7 text-[17px] font-semibold text-[#1c1b19]">
                  {name}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.6] text-[#57554f]">
                  {body}
                </p>

                {/* forward arrow, between cards */}
                {i < 3 ? (
                  <span
                    aria-hidden
                    className="absolute -right-[13px] top-1/2 hidden -translate-y-1/2 text-[#b6b4ae] lg:block"
                  >
                    →
                  </span>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>

        {/* The only feedback edge in the graph, drawn rather than described. */}
        <Reveal delay={340}>
          <svg
            viewBox="0 0 1000 62"
            preserveAspectRatio="none"
            className="mt-2 hidden h-[62px] w-full lg:block"
            aria-hidden
          >
            <path
              d="M875 2 V 30 Q 875 46 859 46 H 391 Q 375 46 375 30 V 10"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="flow-dash"
            />
            <path
              d="M368 18 L375 6 L382 18"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <p className="mt-5 text-[14px] italic text-[#57554f]">
            Risk Cop → Strategy Architect · the only feedback edge in the graph ·
            retry cap of 3
          </p>
        </Reveal>
      </div>
    </Slide>
  );
}

/* ------------------------------------------------------------- 07 Honesty */

const PRINCIPLES = [
  "Risk checked, every time.",
  "Every strategy stress-tested.",
  "Losses modelled, not hidden.",
  "Hard limits, never overridden.",
];

export function Honesty() {
  return (
    <section id="honesty" className="grid lg:grid-cols-[1.15fr_0.85fr]">
      <div className="on-paper relative px-[var(--gutter)] py-24 lg:py-32">
        <div className="max-w-[44rem]">
          <Reveal>
            <h2 className="display">
              5,000 simulations stand behind every result.
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-12 text-[18px] italic text-[#6e6c66]">
              The product is built to refuse to lie to you.
            </p>
            <p className="mt-3 text-[18px] italic text-[#6e6c66]">
              Research, news, access, charts.
            </p>
            <p className="mt-9 max-w-[58ch] text-[17px] leading-[1.66] text-[#2c2b28]">
              A workspace built for judgement, not noise: multi-asset
              monitors, honest charting, and market context that matters.
            </p>
          </Reveal>
        </div>
        <div className="slide-no absolute bottom-7 left-[var(--gutter)] hidden md:block">
          07 · Capital Investment Prospects
        </div>
      </div>

      <div className="flex items-center bg-ink px-[var(--gutter)] py-24 lg:py-32">
        <Reveal delay={140} className="w-full">
          <div className="panel pointer-glow">
            <Eyebrow>Principle</Eyebrow>
            <ol className="mt-7 space-y-2 text-[15px] text-[#d8d8d8]">
              <li>01 · Expectancy over win-rate</li>
              <li>02 · Every number badged ‘simulated’</li>
            </ol>
            <hr className="rule my-8" />
            <ul className="space-y-2.5 text-[15px] text-[#b4b4b4]">
              {PRINCIPLES.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- 08 Death traps */

const TRAPS = [
  [
    "01",
    "Smoothed candles",
    "Heikin-Ashi and synthetic candles show fills that never existed. Rejected at the data layer.",
  ],
  [
    "02",
    "Mid-spread fills",
    "We model order-book depth, maker/taker fees and realistic slippage, never a fantasy price.",
  ],
  [
    "03",
    "Cross-asset reuse",
    "BTC parameters don’t transfer to SOL. Per-asset optimisation is enforced by the validator.",
  ],
  [
    "04",
    "In-sample metrics",
    "70 / 30 chronological split, point-in-time adjusted, no look-ahead, no survivorship cleaning.",
  ],
] as const;

export function DeathTraps() {
  return (
    <Slide n="08">
      <Reveal>
        <h2 className="display">Built to remove the fear from investing</h2>
        <p className="lead mt-6">
          Four “death traps” that fake most backtests are made structurally
          impossible. Not merely discouraged.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {TRAPS.map(([n, title, body], i) => (
          <Reveal key={n} delay={i * 70}>
            <div className="panel card-lift pointer-glow h-full">
              <div className="grid grid-cols-[3rem_1fr] gap-2">
                <span className="text-[17px] text-signal">{n}</span>
                <div>
                  <h3 className="text-[19px] font-semibold">{title}</h3>
                  <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.62] text-[#a8a8a8]">
                    {body}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={320}>
        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-hairline pt-7 text-[13.5px] text-muted">
          <span>Headline by expectancy, never win-rate</span>
          <span>Always the full distribution</span>
          <span>Always benchmarked against buy-and-hold</span>
          <span>Every number badged SIMULATED</span>
          <span>Human approval required</span>
        </div>
      </Reveal>
    </Slide>
  );
}

/* ---------------------------------------------------------- 09 By numbers */

export function Numbers() {
  return (
    <Slide n="09" tone="paper">
      <Reveal>
        <h2 className="display">By the numbers</h2>
        <p className="mt-5 text-[17px] text-[#57554f]">
          The engineering discipline behind every strategy CIP produces.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          delay={0}
          signal
          figure={<CountUp to={5000} thousands />}
          caption="Monte Carlo permutations per risk check"
        />
        <Tile
          delay={70}
          figure={
            <>
              &lt; <CountUp to={60} />s
            </>
          }
          caption="to finish the full simulation, vectorised"
        />
        <Tile
          delay={140}
          figure={<CountUp to={4} />}
          caption="specialised agents in a fixed pipeline"
        />
        <Tile
          delay={210}
          figure={<CountUp to={3} />}
          caption="asset classes: stocks, crypto, forex"
        />
        <Tile delay={280} figure="70/30" caption="chronological train/validate split" />
        <Tile
          delay={350}
          figure={<CountUp to={33} />}
          caption="automated tests, fully offline & green"
        />
      </div>
    </Slide>
  );
}

function Tile({
  figure,
  caption,
  delay,
  signal = false,
}: {
  figure: React.ReactNode;
  caption: string;
  delay: number;
  signal?: boolean;
}) {
  return (
    <Reveal delay={delay}>
      <div className="card-lift pointer-glow relative h-full bg-[#efeeea] px-8 py-10">
        {signal ? (
          <span
            className="absolute left-8 top-6 h-[7px] w-[7px] rounded-full"
            style={{ background: "var(--signal)" }}
            aria-hidden
          />
        ) : null}
        <div className="stat-figure text-[#1c1b19]">{figure}</div>
        <p className="mt-5 text-[14.5px] leading-snug text-[#57554f]">{caption}</p>
      </div>
    </Reveal>
  );
}
