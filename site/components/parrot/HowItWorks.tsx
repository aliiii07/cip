"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScreenBacktest, ScreenPick, ScreenResearch, ScreenStory } from "./PhoneFrames";
import { HOW } from "@/lib/parrot-content";

/**
 * The pinned sequence: a tall track carries a 100vh pane stuck at top:0, and
 * the four device screens crossfade on opacity as the reader scrolls. Each
 * screen gets `active` so its own animation restarts when its step is
 * reached. Mobile drops the pin and stacks the same content.
 */
const SCREENS = [ScreenPick, ScreenStory, ScreenResearch, ScreenBacktest];

export function HowItWorks() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

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
      const next = Math.min(HOW.steps.length - 1, Math.floor(p * HOW.steps.length));
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

  const Steps = ({ current }: { current: number }) => (
    <ol className="relative mt-12 space-y-11">
      <span aria-hidden className="absolute left-[27px] top-3 bottom-6 border-l border-dashed border-[#1a1a1a]" />
      {HOW.steps.map((s, i) => {
        const on = i === current;
        return (
          <li key={s.title} className="relative flex gap-8">
            <span className="relative w-[54px] shrink-0 text-center">
              <span
                className="font-display text-[58px] font-bold leading-none transition-colors duration-300"
                style={{ color: on ? "#1a1a1a" : "#D4D4D8" }}
              >
                {i + 1}
              </span>
              <span className="absolute left-1/2 top-[30px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#1a1a1a]" />
            </span>
            <span className="pt-2">
              <span
                className="block font-display text-[30px] font-semibold leading-tight tracking-[-0.5px] transition-colors duration-300"
                style={{ color: on ? "#1a1a1a" : "#71717A" }}
              >
                {s.title}
              </span>
              <motion.span
                className="block overflow-hidden font-body text-[20px] font-normal leading-[30px] text-[#4a4a4a]"
                initial={false}
                animate={{ opacity: on ? 1 : 0, height: on ? "auto" : 0, marginTop: on ? 8 : 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.3 }}
              >
                {s.body}
              </motion.span>
            </span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <section id="how-it-works" className="pf-grid-light bg-white">
      {/* desktop: pinned */}
      <div ref={trackRef} className="relative hidden h-[3754px] lg:block">
        <div className="sticky top-0 h-screen">
          <div className="mx-auto flex h-full max-w-[1200px] items-center gap-[110px] px-6">
            <div className="relative h-[638px] w-[520px] shrink-0">
              {SCREENS.map((Screen, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center pl-10"
                  initial={false}
                  animate={{ opacity: i === active ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ pointerEvents: i === active ? "auto" : "none" }}
                >
                  <Screen active={i === active} />
                </motion.div>
              ))}
            </div>
            <div className="w-[560px]">
              <h2 className="font-display text-[50px] font-semibold leading-[50px] tracking-[-1px] text-[#1a1a1a]">
                {HOW.h2}
              </h2>
              <Steps current={active} />
              <p className="mt-10 max-w-[560px] font-body text-[15px] font-light leading-relaxed text-[#8a8a8a]">
                {HOW.caption}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* mobile: plain stack */}
      <div className="mx-auto max-w-content px-6 py-20 lg:hidden">
        <h2 className="font-display text-[36px] font-semibold leading-[1.05] tracking-[-1px] text-[#1a1a1a]">
          {HOW.h2}
        </h2>
        <div className="mt-10 origin-top scale-[0.9]">
          <div className="relative mx-auto h-[620px] w-[300px]">
            <ScreenPick active />
          </div>
        </div>
        <Steps current={-1} />
        <p className="mt-10 font-body text-[13px] font-light leading-relaxed text-[#8a8a8a]">{HOW.caption}</p>
      </div>
    </section>
  );
}
