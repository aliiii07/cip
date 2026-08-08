import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CountUp, Eyebrow, Reveal, Slide, SlideNo } from "./primitives";
import { DemoCta, WaitlistForm } from "./ContactForms";
import { Magnetic } from "./Magnetic";
import { STAGE } from "@/lib/constants";

/* -------------------------------------------------------------- 10 Status */

const PHASES = [
  ["P0", "Truthful docs, validator, integrity rules"],
  ["P1", "FastAPI backend, persistence, live event stream"],
  ["P2", "Next.js app shell, builder, CI"],
  ["P3", "Symbol search, live data, indicators & analysis engine"],
] as const;

export function Status() {
  return (
    <section className="grid lg:grid-cols-[1.2fr_0.8fr]">
      <div className="on-paper relative px-[var(--gutter)] py-24 lg:py-32">
        <Reveal>
          <h2 className="display">Shipped, not slideware</h2>
          <p className="mt-5 max-w-[52ch] text-[17px] text-[#57554f]">
            Four phases live. The pipeline, the risk gates and the analysis
            engine already run on real market data.
          </p>
        </Reveal>

        <div className="mt-14 space-y-3">
          {PHASES.map(([p, label], i) => (
            <Reveal key={p} delay={i * 80}>
              <div className="flex items-center gap-6">
                <span
                  className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center text-[15px] ${
                    i === PHASES.length - 1
                      ? "bg-ink text-white"
                      : "bg-[#efeeea] text-[#2c2b28]"
                  }`}
                >
                  {p}
                </span>
                <span className="flex-1 text-[16px] text-[#2c2b28]">{label}</span>
                <span className="eyebrow shrink-0 text-signal">Shipped</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="slide-no absolute bottom-7 left-[var(--gutter)] hidden md:block">
          10 — Capital Investment Prospects
        </div>
      </div>

      <div className="flex items-center bg-ink px-[var(--gutter)] py-24 lg:py-32">
        <Reveal delay={120} className="w-full">
          <h2 className="display">
            Where we
            <br />
            are today
          </h2>
          <div className="panel mt-12">
            <Eyebrow>Status</Eyebrow>
            <ul className="mt-5 space-y-2.5 text-[15px] text-[#d0d0d0]">
              <li>Early days</li>
              <li>Core pipeline running</li>
              <li>Still building</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 11 Opportunity */

export function Opportunity() {
  return (
    <Slide n="11">
      <Reveal>
        <h2 className="display">The opportunity</h2>
        <p className="lead mt-6">
          The category is proven at the top. No one has built the automatic,
          affordable version for everyone below it.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        <Reveal delay={0}>
          <div className="panel card-lift pointer-glow h-full">
            <div className="stat-figure">
              <CountUp to={10} prefix="~$" suffix="B+" />
            </div>
            <p className="mt-6 text-[14.5px] text-[#a0a0a0]">
              Bloomberg’s terminal business, per year
            </p>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="panel card-lift pointer-glow h-full">
            <div className="stat-figure">
              <CountUp to={325} prefix="~" suffix="k" />
            </div>
            <p className="mt-6 text-[14.5px] text-[#a0a0a0]">
              terminals at ~$30k each — pros only
            </p>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="panel panel-signal card-lift pointer-glow relative h-full">
            <span
              className="absolute -left-[4px] -top-[4px] h-[9px] w-[9px] rounded-full"
              style={{ background: "var(--signal)" }}
              aria-hidden
            />
            <div className="stat-figure">
              <CountUp to={100} suffix="M+" />
            </div>
            <p className="mt-6 text-[14.5px] text-[#c9bdbb]">
              retail traders worldwide, largely unserved
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={280}>
        <p className="mt-12 text-[16px] italic text-[#a8a8a8]">
          Every year more of the world’s trading moves to retail. CIP is priced
          and built for exactly that shift.
        </p>
        <p className="mt-3 text-[12px] text-muted-2">Industry figures approximate.</p>
      </Reveal>
    </Slide>
  );
}

/* ------------------------------------------------------------- 12 Pricing */

const TIERS = [
  [
    "Starter",
    "Entry-level access: core features, limited runs, small monthly price.",
    false,
  ],
  [
    "Retail",
    "Full pipeline, unlimited strategies, all data providers. Monthly subscription.",
    true,
  ],
  [
    "Prop / Team",
    "Seats, higher limits and priority data for small prop firms: per-seat pricing.",
    false,
  ],
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="grid lg:grid-cols-[0.8fr_1.2fr]">
      <div className="flex items-center bg-ink px-[var(--gutter)] py-24 lg:py-32">
        <Reveal className="w-full">
          <Eyebrow>Bloomberg</Eyebrow>
          <div className="stat-figure mt-5">~$30,000</div>
          <p className="mt-4 text-[14.5px] text-[#a0a0a0]">per user, per year</p>

          <p className="mt-10 text-[19px] italic text-signal">vs</p>

          <div className="mt-10 eyebrow">CIP</div>
          <div className="display mt-4 leading-[1.08]">
            a small fraction
            <br />
            of the cost
          </div>
        </Reveal>
      </div>

      <div className="on-paper relative px-[var(--gutter)] py-24 lg:py-32">
        <Reveal>
          <h2 className="display">How we make money</h2>
        </Reveal>

        <dl className="mt-14">
          {TIERS.map(([name, body, highlight], i) => (
            <Reveal key={name} delay={i * 90}>
              <div className="grid gap-3 border-t border-[#e2e0da] py-9 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <dt
                  className={`text-[15px] ${
                    highlight
                      ? "eyebrow !text-signal"
                      : "eyebrow !text-[#4a4843]"
                  }`}
                >
                  {name}
                </dt>
                <dd className="text-[16.5px] leading-[1.6] text-[#2c2b28]">
                  {body}
                  <span className="mt-2 block text-[13px] text-[#8b8983]">
                    Pricing announced at launch.
                  </span>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal delay={280}>
          <p className="mt-6 border-t border-[#e2e0da] pt-7 text-[15px] italic text-[#57554f]">
            Subscription-first. Land with retail, expand into prop firms.
          </p>
        </Reveal>

        <div className="slide-no absolute bottom-7 left-[var(--gutter)] hidden md:block">
          12 — Capital Investment Prospects
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- 13 Roadmap */

const NEXT = [
  ["P4", "Screener & scanner", "Rank markets by volume, volatility, trend and momentum into watchlists."],
  ["P5", "Variant lab", "Generate strategy variants with explicit reject reasons and a confidence score."],
  ["P6", "Decision memos", "Bull / bear / key-unknown reports and simulated paper fills."],
  ["P7", "Monitor", "Bar-close radar with a live stage wheel and alerts."],
  ["P8", "Hardening", "Banned-terms CI, gate-immutability tests, security pass."],
] as const;

export function Roadmap() {
  return (
    <Slide n="13" tone="paper">
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

/* -------------------------------------------------------------- 14 Vision */

export function Vision() {
  return (
    <Slide n="14">
      <div className="grid items-center gap-16 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal>
          <Eyebrow>Our vision</Eyebrow>
          <h2 className="display mt-7 max-w-[16ch]">
            The platform to success in trading.
          </h2>
          <p className="lead mt-12">
            Bloomberg brought transparency to institutions for forty years.
            The next leap isn’t more data for the few — it’s honest, automated
            research for the millions never let in.
          </p>
          <p className="mt-10 text-[clamp(1.25rem,2.4vw,2rem)] italic">
            Younger. Simpler. Cheaper.{" "}
            <span style={{ color: "var(--signal)" }}>Automatic.</span>
          </p>
        </Reveal>

        <Reveal delay={160} className="hidden justify-center lg:flex">
          <LogoMark className="idle-bob h-[190px] w-[240px] text-white" />
        </Reveal>
      </div>
    </Slide>
  );
}

/* ----------------------------------------------------------------- 15 CTA */

const CLOSING_META = [
  ["Category", "Fintech · quantitative research"],
  ["Stage", STAGE],
  ["Ask", "President Tech Award — build the next Bloomberg"],
] as const;

export function FinalCta() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden px-[var(--gutter)] py-28 md:py-36"
    >
      <div className="deck-inner">
        <Reveal className="flex flex-col items-center text-center">
          <LogoMark className="idle-bob h-[76px] w-[96px] text-white" />
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
          <div className="mx-auto mt-16 grid max-w-[52rem] gap-10 border-t border-hairline pt-12 md:grid-cols-2 md:gap-14">
            <WaitlistForm />
            <DemoCta />
          </div>
        </Reveal>

        <Reveal delay={280}>
          <p className="mt-14 text-center text-[13.5px] text-muted">
            Want to see it work first?{" "}
            <Link href="/prototype" className="text-white underline underline-offset-4">
              Run the prototype
            </Link>{" "}
            — pick an asset and watch the four agents.
          </p>
        </Reveal>
      </div>

      <SlideNo n="15" />
    </section>
  );
}
