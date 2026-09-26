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
            The proof layer for investing.
          </h2>
          <p className="lead mt-12">
            Access to expert strategies was never the hard part. Knowing which
            of them survive a check is. CIP puts that check between every
            strategy and the person about to trust it.
          </p>
          <p className="mt-10 text-[clamp(1.25rem,2.4vw,2rem)] italic">
            Human experts.{" "}
            <span style={{ color: "var(--signal)" }}>Machine verification.</span>
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
  ["Ask", "President Tech Award 2026, organised by IT Park"],
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
            Build your own or follow an expert. Nothing reaches you untested.
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
            and watch the verification engine run.
          </p>
        </Reveal>
      </div>

      <SlideNo n="11" />
    </section>
  );
}
