"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { FundMark } from "./BrandMarks";
import { ParrotMark } from "./ParrotLogo";
import { CALC } from "@/lib/parrot-content";

const usd = (n: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function Total({ label, value, rate }: { label: string; value: number; rate: number }) {
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
    <div className="text-center">
      <div className="font-display text-[26px] font-medium text-white lg:text-[36px]">{label}</div>
      <motion.div
        className="mt-3 font-display text-[64px] font-bold leading-none tracking-[-2px] text-white lg:text-[112px]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <motion.span>{text}</motion.span>
      </motion.div>
      <div className="mt-4 font-body text-[20px] text-[#A1A1AA] lg:text-[28px]">
        +{(rate * 100).toFixed(2)}%
      </div>
    </div>
  );
}

/** The strategy-card collage, positioned on desktop and a slider on mobile. */
const POSITIONS = [
  { left: 0, top: 0, z: 1 },
  { left: 230, top: 60, z: 2 },
  { left: 575, top: 55, z: 1 },
  { left: 415, top: 130, z: 3 },
  { left: 805, top: 0, z: 1 },
] as const;

function StrategyCard({ card }: { card: (typeof CALC.cards)[number] }) {
  const hero = "hero" in card && card.hero;
  return (
    <div
      className={`flex h-[190px] w-[320px] flex-col justify-between rounded-[14px] border p-5 ${
        hero ? "border-white bg-white text-[#1a1a1a]" : "border-white/70 bg-parrot-black text-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-[15px] font-semibold">{card.name}</span>
        {card.fund ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-[#e4e4e4]">
            <FundMark name={card.fund} size={6} />
          </span>
        ) : null}
      </div>
      {card.period ? (
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-[15px] font-semibold">{card.period}</div>
            <div className="font-display text-[16px] font-semibold text-[#5FB320]">{card.value}</div>
          </div>
          {hero ? <ParrotMark className="h-7 w-7" /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function GrowthCalculator() {
  const [raw, setRaw] = useState("");
  const principal = Math.max(0, Number(raw.replace(/[^0-9.]/g, "")) || 0);

  return (
    <section
      id="calculator"
      className="relative overflow-hidden rounded-bl-[160px] rounded-tr-[160px] bg-parrot-black py-24 lg:rounded-bl-[220px] lg:rounded-tr-[220px] lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1580px] px-6 text-center lg:px-[60px]">
        <h2 className="font-display text-[36px] font-semibold leading-[1.08] tracking-[-1px] text-white lg:text-[64px] lg:leading-[72px]">
          {CALC.h2}
        </h2>
        <p className="mx-auto mt-5 max-w-[900px] font-body text-[18px] leading-[28px] text-[#A1A1AA] lg:text-[28px] lg:leading-[36.4px]">
          {CALC.sub}
        </p>

        <label className="mx-auto mt-14 inline-flex max-w-[460px] items-baseline justify-center border-b-4 border-[#3F3F46] pb-2 lg:mt-20">
          <span className="font-display text-[44px] font-semibold text-[#71717A] lg:text-[64px]">$</span>
          <input
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={CALC.placeholder}
            aria-label="Investment amount"
            className="w-[300px] bg-transparent font-display text-[44px] font-semibold text-white outline-none placeholder:text-[#71717A] lg:w-[420px] lg:text-[64px]"
          />
        </label>

        {/* collage: desktop absolute layout */}
        <div className="relative mx-auto mt-16 hidden h-[340px] w-[1125px] lg:block">
          {CALC.cards.map((card, i) => (
            <div
              key={card.name}
              className="absolute"
              style={{ left: POSITIONS[i].left, top: POSITIONS[i].top, zIndex: POSITIONS[i].z }}
            >
              <StrategyCard card={card} />
            </div>
          ))}
          {CALC.ghosts.map((g, i) => (
            <div
              key={g.name}
              className="absolute rounded-[14px] border border-white/20 bg-parrot-black p-4 text-left opacity-30"
              style={i === 0 ? { left: -230, top: 200, width: 250, height: 150 } : { left: 1020, top: 275, width: 120, height: 70 }}
            >
              <div className="font-display text-[12px] font-semibold text-white">{g.name}</div>
              <div className="mt-8 font-display text-[16px] font-semibold text-white">{i === 0 ? g.value : ""}</div>
              <div className="text-[11px] text-[#5FB320]">{i === 0 ? g.delta : ""}</div>
            </div>
          ))}
        </div>

        {/* collage: mobile slider */}
        <div className="mt-12 overflow-x-auto pb-4 [scrollbar-width:none] lg:hidden">
          <div className="flex w-max gap-4 px-2">
            {CALC.cards.map((card) => (
              <StrategyCard key={card.name} card={card} />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-[1000px] gap-14 lg:mt-6 lg:grid-cols-2">
          <Total label={CALC.savings.label} value={principal * (1 + CALC.savings.rate)} rate={CALC.savings.rate} />
          <Total label={CALC.parrot.label} value={principal * (1 + CALC.parrot.rate)} rate={CALC.parrot.rate} />
        </div>

        <p className="mx-auto mt-16 max-w-[1580px] font-body text-[13px] font-light leading-[22px] text-[#71717A] lg:text-[16px] lg:leading-[26px]">
          {CALC.disclaimer}
        </p>
        <a href="#disclosures" className="mt-4 inline-block font-body text-[15px] text-white underline underline-offset-4">
          {CALC.link}
        </a>
      </div>
    </section>
  );
}
