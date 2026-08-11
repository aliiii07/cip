import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Eyebrow, Reveal, Slide, SlideNo } from "./primitives";
import { WaitlistForm } from "./ContactForms";
import { ScrollParallax } from "./ScrollParallax";
import { STAGE } from "@/lib/constants";

/* -------------------------------------------------------------- 10 Vision */

export function Vision() {
  return (
    <Slide n="10">
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

/* ----------------------------------------------------------------- 11 CTA */

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

      <SlideNo n="11" />
    </section>
  );
}
