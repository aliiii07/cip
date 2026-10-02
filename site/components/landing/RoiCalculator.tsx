"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * The modelled-path illustration.
 *
 * This section deliberately does NOT advertise a CIP return. The layout, the
 * collage, the spring counters and the five chips are all here, but the two
 * totals are driven by rates the reader sets and sees, labelled as inputs to
 * an arithmetic illustration rather than as anything CIP achieved.
 *
 * The reason is not squeamishness: CIP is paper-only on a small set of
 * symbols, so a headline percentage attached to a named book would be a
 * track record that does not exist, and AGENTS.md forbids return language in
 * marketing outright. The chips therefore carry capability, not performance.
 */

const usd = (n: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/** Rates are stated as assumptions of the illustration, not as CIP results. */
const CASH_RATE = 0.0039;
const MODEL_RATE = 0.05;

const CHIPS: { label: string; meta: string; highlight?: boolean }[] = [
  { label: "AI risk reviewed", meta: "Every strategy, before listing" },
  { label: "Backtested history", meta: "Point-in-time, no look-ahead" },
  { label: "Verified Global Equity", meta: "Expectancy ranked", highlight: true },
  { label: "Diversification cap", meta: "No holding above ~5%" },
  { label: "Paper-first", meta: "Zero real-money risk" },
];

function Total({
  value,
  tone,
  caption,
}: {
  value: number;
  tone: "light" | "titanium";
  caption: string;
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.6 });
  const text = useTransform(spring, (v) => usd(v));

  useEffect(() => {
    if (reduced) {
      mv.jump(value);
      spring.jump(value);
      return;
    }
    mv.set(value);
  }, [value, mv, spring, reduced]);

  return (
    <div className="flex-1">
      <motion.div
        className="font-display text-[34px] font-semibold tracking-[-1px] text-white lg:text-[44px]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <motion.span>{text}</motion.span>
      </motion.div>
      <div
        className="mt-2 inline-block rounded-[6px] border px-2.5 py-1 font-body text-[12px] font-medium"
        style={{
          borderColor: "#3F3F46",
          color: tone === "titanium" ? "#9F9D9B" : "#C2C0BC",
        }}
      >
        {caption}
      </div>
    </div>
  );
}

export function RoiCalculator() {
  const [raw, setRaw] = useState("");
  const principal = raw.trim() === "" ? 10000 : Math.max(0, Number(raw.replace(/[^0-9.]/g, "")) || 0);

  return (
    <section className="missing-area relative overflow-hidden bg-dark-bg-2 py-24 lg:py-[120px]">
      {/* original collage, drawn */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <Image
          src="/landing/missing-shape.svg"
          alt=""
          width={940}
          height={252}
          className="h-[252px] w-[940px] max-w-none opacity-70"
        />
      </div>

      <div className="relative mx-auto max-w-content px-6 lg:px-0">
        <h2 className="max-w-[800px] font-display text-[32px] font-semibold leading-[1.1] tracking-[-1px] text-white lg:text-[48px] lg:leading-[52.8px]">
          This is what you&apos;ve been missing
        </h2>
        <p className="mt-6 max-w-[760px] font-body text-[18px] font-normal leading-[28px] tracking-[-0.5px] text-text-light-muted lg:text-[28px] lg:leading-[36.4px]">
          Enter an amount to see how a modelled annual rate compounds over one
          year. A hypothetical arithmetic example, not a forecast and not a C.I.P
          result.
        </p>

        <div className="mt-14 max-w-[560px]">
          <label htmlFor="calc-amount" className="font-body text-[13px] font-light uppercase tracking-[0.18em] text-text-light-muted">
            Amount
          </label>
          <div className="mt-3 flex items-baseline gap-2 border-b-4 border-dark-border pb-3">
            <span className="font-display text-[34px] font-semibold text-text-light-muted lg:text-[48px]">
              $
            </span>
            <input
              id="calc-amount"
              inputMode="numeric"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Enter Amount"
              className="w-full bg-transparent font-display text-[34px] font-semibold text-white outline-none placeholder:text-text-light-muted lg:text-[48px]"
            />
          </div>

          <div className="mt-10 flex gap-10">
            <Total
              value={principal * (1 + CASH_RATE)}
              tone="light"
              caption={`Cash-like, at ${(CASH_RATE * 100).toFixed(2)}% assumed`}
            />
            <Total
              value={principal * (1 + MODEL_RATE)}
              tone="titanium"
              caption={`Modelled, at ${(MODEL_RATE * 100).toFixed(0)}% assumed`}
            />
          </div>

          <p className="mt-6 font-body text-[13px] font-light leading-relaxed text-text-light-muted">
            Both figures are arithmetic on the rates shown, which are
            assumptions of this illustration. Simulated. Past simulated paths
            do not indicate future results.{" "}
            <a href="/legal" className="text-titanium-light underline underline-offset-4">
              See assumptions
            </a>
          </p>
        </div>

        <ul className="mt-16 flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0">
          {CHIPS.map((c) => (
            <li
              key={c.label}
              className="w-[235px] shrink-0 rounded-[10px] border p-[14px]"
              style={{
                borderColor: "#3F3F46",
                background: c.highlight ? "#F5F5F7" : "transparent",
              }}
            >
              <div
                className="font-display text-[16px] font-semibold tracking-[-0.3px]"
                style={{ color: c.highlight ? "#0A0A0A" : "#FFFFFF" }}
              >
                {c.label}
              </div>
              <div
                className="mt-1 font-body text-[13px] font-normal"
                style={{ color: c.highlight ? "#71717A" : "#A1A1AA" }}
              >
                {c.meta}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
