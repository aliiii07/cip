"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The pinned sequence.
 *
 * A 3754px track carries a 100vh pane stuck at top:0 — top:0 rather than an
 * offset, because any offset leaves a sliver of the previous section visible
 * above the pinned pane for the whole scroll and the seam is obvious.
 *
 * Frames crossfade on opacity alone. No slide: four device shots that shift
 * by even a few pixels read as a carousel, where a pure dissolve reads as one
 * screen changing state, which is what is actually being described.
 *
 * On mobile the pin is dropped entirely and the same content stacks, since
 * pinning a full-height pane on a short viewport traps the scroll.
 */

const STEPS = [
  {
    index: "1",
    title: "Browse Verified Strategies",
    body: "Scroll a curated list of expert strategies, completely verified by AI and data. SIMULATED labels.",
    src: "/landing/frame-browse.png",
    mobile: "/landing/frame-browse@mobile.png",
    alt: "Browsing a list of verified strategies, each badged simulated",
  },
  {
    index: "2",
    title: "Follow with Confidence",
    body: "Pick a strategy and copy it into a paper session inside CIP.",
    src: "/landing/frame-follow.png",
    mobile: "/landing/frame-follow@mobile.png",
    alt: "Copying a verified strategy into a paper session",
  },
  {
    index: "3",
    title: "Auto-Follow Re-Verification",
    body: "When an expert makes a move, CIP re-checks it with data and AI risk reviews before the paper book updates.",
    src: "/landing/frame-reverify.png",
    mobile: "/landing/frame-reverify@mobile.png",
    alt: "Checking a new expert move against AI risk parameters",
  },
  {
    index: "4",
    title: "Build or Track on Paper",
    body: "Edit with AI agents or watch simulated money. Zero real-money risk. $100,000 paper.",
    src: "/landing/frame-build.png",
    mobile: "/landing/frame-build@mobile.png",
    alt: "Strategy editor beside a $100,000 paper balance",
  },
];

const CAPTION =
  "Strategies and images are illustrative. Figures are simulated. Not a recommendation.";

function Rail({ active }: { active: number }) {
  return (
    <div className="mt-10 flex gap-2" aria-hidden>
      {STEPS.map((s, i) => (
        <span
          key={s.index}
          className="h-[7px] w-[7px] rounded-full transition-colors duration-300"
          style={{ background: i === active ? "#C2C0BC" : "#27272A" }}
        />
      ))}
    </div>
  );
}

export function HowItWorksScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  /**
   * Progress is measured off the track's own rect rather than through a
   * scroll-offset helper. The pane is pinned for exactly the distance the
   * track is taller than the viewport, so that distance is the denominator;
   * deriving it here means the frames stay in step with the pin even if the
   * track height or the viewport changes, and it is trivially inspectable.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      const next = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      setActive((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="how-it-works" className="bg-true-black">
      {/* ------------------------------------------------ desktop: pinned */}
      <div ref={trackRef} className="relative hidden h-[3754px] lg:block">
        <div className="sticky top-0 h-screen">
          <div className="mx-auto flex h-full max-w-content items-center gap-[120px]">
            {/* left: the device art, 500×638 box */}
            <div className="relative h-[638px] w-[500px] shrink-0">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.src}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={false}
                  animate={{ opacity: i === active ? 1 : 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                  }
                >
                  <Image
                    src={s.src}
                    alt={s.alt}
                    width={940}
                    height={1200}
                    priority={i === 0}
                    className="h-[638px] w-auto"
                  />
                </motion.div>
              ))}
            </div>

            {/* right: heading + steps, 460×608 box */}
            <div className="w-[460px]">
              <h2 className="font-display text-[50px] font-semibold leading-[50px] tracking-[-1px] text-white">
                How CIP Works
              </h2>

              <ol className="mt-12 space-y-8">
                {STEPS.map((s, i) => {
                  const on = i === active;
                  return (
                    <li key={s.index} className="flex gap-6">
                      <span
                        className="font-display text-[58px] font-bold leading-none transition-colors duration-300"
                        style={{ color: on ? "#C2C0BC" : "#A1A1AA" }}
                      >
                        {s.index}
                      </span>
                      <span className="pt-2">
                        <span
                          className="block font-display text-[30px] font-semibold leading-tight tracking-[-0.5px] transition-colors duration-300"
                          style={{ color: on ? "#FFFFFF" : "#71717A" }}
                        >
                          {s.title}
                        </span>
                        <motion.span
                          className="mt-2 block font-body text-[20px] font-medium leading-[30px] text-text-light-muted"
                          initial={false}
                          animate={{ opacity: on ? 1 : 0.45 }}
                          transition={reduced ? { duration: 0 } : { duration: 0.3 }}
                        >
                          {s.body}
                        </motion.span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              <Rail active={active} />

              <p className="mt-8 font-body text-[13px] font-light leading-relaxed text-text-light-muted">
                {CAPTION}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- mobile: plain stack */}
      <div className="mx-auto max-w-content px-6 py-20 lg:hidden">
        <h2 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-1px] text-white">
          How CIP Works
        </h2>
        <ol className="mt-10 space-y-14">
          {STEPS.map((s) => (
            <li key={s.index}>
              <Image
                src={s.mobile}
                alt={s.alt}
                width={470}
                height={600}
                className="mx-auto h-[420px] w-auto"
              />
              <div className="mt-6 flex gap-4">
                <span className="font-display text-[40px] font-bold leading-none text-titanium-light">
                  {s.index}
                </span>
                <span>
                  <span className="block font-display text-[22px] font-semibold tracking-[-0.5px] text-white">
                    {s.title}
                  </span>
                  <span className="mt-1.5 block font-body text-[16px] font-medium leading-[26px] text-text-light-muted">
                    {s.body}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 font-body text-[13px] font-light leading-relaxed text-text-light-muted">
          {CAPTION}
        </p>
      </div>
    </section>
  );
}
