"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The hero's three drawn pieces sit in one absolute layer so the type can be
 * centred independently of them: the 205 badge upper-left under the nav, the
 * 1160 arc spanning the section, and the 290 bill stack at the arc's apex.
 *
 * The badge is the only looping animation on the page. It stops entirely
 * under prefers-reduced-motion rather than slowing down, since a spinning
 * ring is exactly the kind of motion that setting exists to remove.
 */

const CIRCLE_TEXT = "AI VERIFIED STRATEGIES • BACKTESTED & RISK REVIEWED • ";

function VerifiedBadge() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-[100px] hidden h-[205px] w-[205px] lg:block"
      animate={reduced ? undefined : { rotate: 360 }}
      transition={reduced ? undefined : { duration: 20, ease: "linear", repeat: Infinity }}
    >
      <svg viewBox="0 0 205 205" className="h-full w-full">
        <defs>
          <path
            id="badgeArc"
            d="M102.5 102.5 m -82 0 a 82 82 0 1 1 164 0 a 82 82 0 1 1 -164 0"
            fill="none"
          />
        </defs>
        <circle cx="102.5" cy="102.5" r="101" fill="none" stroke="#3F3F46" />
        <circle cx="102.5" cy="102.5" r="66" fill="none" stroke="#3F3F46" strokeOpacity=".7" />
        <text
          fill="#9F9D9B"
          fontSize="10.5"
          letterSpacing="2.6"
          fontFamily="var(--font-figtree), sans-serif"
          fontWeight={600}
        >
          <textPath href="#badgeArc" startOffset="0">
            {CIRCLE_TEXT + CIRCLE_TEXT}
          </textPath>
        </text>
        {/* inner shield + check */}
        <path
          d="M102.5 70 l26 10 v20 c0 17-11 28-26 34 -15-6-26-17-26-34 V80 z"
          fill="none"
          stroke="#9F9D9B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M91 104 l8 8 l16-18"
          fill="none"
          stroke="#C2C0BC"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

export function HeroSection() {
  const reduced = useReducedMotion();
  const rise = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section className="banner-area relative overflow-hidden bg-dark-bg-2 pt-[94px]">
      <div className="relative mx-auto min-h-[1000px] max-w-artboard px-6 lg:px-0">
        {/* arc, drawn once, spanning the section behind the type */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[150px] hidden w-[1160px] -translate-x-1/2 lg:block"
        >
          <Image
            src="/landing/hero-arc.svg"
            alt=""
            width={1160}
            height={586}
            priority
            className="h-[586px] w-[1160px]"
          />
        </div>

        <div className="relative mx-auto max-w-content">
          <VerifiedBadge />

          <div className="flex flex-col items-center pt-[120px] text-center lg:pt-[164px]">
            <motion.div aria-hidden {...rise}>
              <Image
                src="/landing/hero-bills.svg"
                alt=""
                width={290}
                height={196}
                priority
                className="h-[140px] w-[207px] lg:h-[196px] lg:w-[290px]"
              />
            </motion.div>

            <motion.h1
              {...rise}
              transition={
                reduced ? undefined : { duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }
              }
              className="mt-10 max-w-[928px] font-display text-[38px] font-semibold leading-[1.12] tracking-[-1px] text-white lg:text-[62px] lg:leading-[74.4px]"
            >
              Easy Investing, Backed by AI-Verified Expert Strategies
            </motion.h1>

            <motion.p
              {...rise}
              transition={
                reduced ? undefined : { duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }
              }
              className="mt-7 max-w-[692px] font-body text-[17px] font-normal leading-[27px] text-text-dark-muted lg:text-[24px] lg:leading-[36px]"
            >
              Follow expert playbooks safely. Nothing reaches you until C.I.P
              verifies it with data, research, backtesting, and AI risk
              reviews.
            </motion.p>

            <motion.div
              {...rise}
              transition={
                reduced ? undefined : { duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }
              }
              className="mt-10"
            >
              <Link
                href="/prototype"
                className="inline-block rounded-[80px] bg-white px-5 py-4 font-display text-[20px] font-medium leading-none text-pure-black transition-transform duration-200 hover:scale-[1.03]"
              >
                Start on paper
              </Link>
            </motion.div>

            <p className="mt-6 font-body text-[13px] font-light text-text-light-muted">
              Paper-trading only. Simulated figures throughout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
