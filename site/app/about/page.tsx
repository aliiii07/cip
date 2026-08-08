import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow, Reveal, Slide } from "@/components/marketing/primitives";
import { LogoSquare } from "@/components/Logo";
import { STAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About — Capital Investment Prospects",
  description:
    "CIP turns a plain-English trading idea into a backtested, risk-managed strategy. Built in Uzbekistan for emerging-market investors.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="pt-[68px]">
        <Slide>
          <Reveal>
            <Eyebrow>About us</Eyebrow>
            <h1 className="display mt-7 max-w-[18ch]">
              Capital Investment Prospects
            </h1>
          </Reveal>

          <div className="mt-14 grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <Reveal delay={80}>
              <div className="space-y-6 text-[17px] leading-[1.68] text-[#c6c6c6]">
                <p>
                  CIP turns a plain-English trading idea — “buy the breakout when
                  volume confirms” — into a backtested, risk-managed strategy. No
                  code, no broker wiring, no market-microstructure expertise
                  required.
                </p>
                <p>
                  Input a hypothesis in ordinary language. Output a
                  strictly-typed strategy, a full distribution of backtest
                  results across realistic costs, and a risk report — built for
                  retail investors and for firms.
                </p>
                <p className="text-white">
                  We are building it from Uzbekistan, for the millions of
                  emerging-market investors that professional tooling was never
                  priced for.
                </p>
                <p>
                  The product’s defining constraint is honesty. A backtest that
                  flatters itself is worse than no backtest, because it costs
                  real money to discover. So the four ways a backtest lies are
                  made structurally impossible rather than discouraged, every
                  simulated figure is badged, and a strategy that fails its risk
                  gates is reported as rejected rather than quietly softened.
                </p>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="flex items-center justify-center bg-[#111] px-8 py-16">
                <LogoSquare className="h-[180px] w-[180px]" />
              </div>

              <dl className="mt-8 space-y-4">
                {[
                  ["Stage", STAGE],
                  ["Model", "Multi-agent LLM pipeline"],
                  ["Markets", "Stocks · Crypto · Forex"],
                  ["Execution", "Paper only, on real market data"],
                ].map(([k, v]) => (
                  <div key={k} className="border-t border-hairline pt-4">
                    <dt className="eyebrow">{k}</dt>
                    <dd className="mt-1.5 text-[15px] text-[#d4d4d4]">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={240}>
            <div className="mt-20 flex flex-wrap gap-3 border-t border-hairline pt-10">
              <Link href="/prototype" className="btn btn-primary">
                Run the prototype
              </Link>
              <Link href="/#contact" className="btn btn-ghost">
                Get in touch
              </Link>
            </div>
          </Reveal>
        </Slide>
      </main>
      <Footer />
    </>
  );
}
