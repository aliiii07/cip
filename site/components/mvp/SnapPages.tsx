"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EASE_PREMIUM, prefersReducedMotion } from "@/lib/motion";
import { FOCUS_RING } from "./styles";

/**
 * A fixed stack of screen tall pages with one gesture per page.
 *
 * The track slides by whole pages; there is no free scrolling anywhere. One
 * wheel tick, trackpad swipe, touch swipe or key press moves exactly one page
 * and then the input is locked until the slide has finished and the input
 * has gone quiet, which is what stops a trackpad's inertia tail from carrying
 * the reader two pages at once. Under reduced motion the slide is instant and
 * the quiet window still applies.
 */

const SLIDE_MS = 600;
/** How long input must be silent after a slide before the next one may start. */
const QUIET_MS = 220;
/** Wheel deltas below this are trackpad noise, not intent. */
const WHEEL_MIN = 6;
const SWIPE_MIN = 40;

export type Tone = "light" | "dark";

export function SnapPages({
  pages,
  tones,
}: {
  pages: ReactNode[];
  /** Background tone of each page, so the indicator stays readable over it. */
  tones?: Tone[];
}) {
  const count = pages.length;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [reduced, setReduced] = useState(false);

  const locked = useRef(false);
  const unlockAt = useRef(0);
  const unlockTimer = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  const holdLock = useCallback((notBefore: number) => {
    const until = Math.max(notBefore, performance.now() + QUIET_MS);
    unlockAt.current = Math.max(unlockAt.current, until);
    window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      locked.current = false;
    }, unlockAt.current - performance.now());
  }, []);

  const go = useCallback(
    (next: number) => {
      if (locked.current) return;
      const target = Math.max(0, Math.min(count - 1, next));
      if (target === indexRef.current) return;
      indexRef.current = target;
      setIndex(target);
      locked.current = true;
      unlockAt.current = 0;
      holdLock(performance.now() + (reduced ? 0 : SLIDE_MS));
    },
    [count, reduced, holdLock]
  );

  useEffect(() => {
    // On the window, not the track: the fixed header sits beside the track,
    // and a wheel over it should page too. Native and non passive, because
    // React registers wheel listeners as passive and would drop the
    // preventDefault that keeps the browser from scrolling anything itself.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (locked.current) {
        holdLock(0);
        return;
      }
      if (Math.abs(dy) < WHEEL_MIN) return;
      go(indexRef.current + (dy > 0 ? 1 : -1));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go, holdLock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      let next: number;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          next = indexRef.current + 1;
          break;
        case "ArrowUp":
        case "PageUp":
          next = indexRef.current - 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = count - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, count]);

  useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) < SWIPE_MIN || Math.abs(dy) < Math.abs(dx)) return;
    go(indexRef.current + (dy < 0 ? 1 : -1));
  };

  const duration = reduced ? 0 : SLIDE_MS;
  const tone = tones?.[index] ?? "dark";

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      // Every page paints its own background; the track takes the current
      // page's tone so the fixed indicator over it is measured against the
      // surface it actually sits on.
      className={`fixed inset-0 overflow-hidden ${tone === "light" ? "bg-white" : "bg-parrot-dark"}`}
      style={{ touchAction: "none", overscrollBehavior: "none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex h-full flex-col will-change-transform"
        style={{
          transform: `translate3d(0, ${-index * 100}%, 0)`,
          transition: `transform ${duration}ms ${EASE_PREMIUM}`,
        }}
      >
        {pages.map((page, i) => (
          <section
            key={i}
            className="h-full w-full shrink-0"
            aria-hidden={i !== index}
            // `inert` keeps the off screen page out of the tab order; focus
            // landing there would scroll the clipped track out of alignment.
            // Set as an attribute because this React version has no prop for it.
            ref={(el) => {
              el?.toggleAttribute("inert", i !== index);
            }}
          >
            {page}
          </section>
        ))}
      </div>

      <Indicator index={index} count={count} onSelect={go} tone={tone} />
    </div>
  );
}

function Indicator({
  index,
  count,
  onSelect,
  tone,
}: {
  index: number;
  count: number;
  onSelect: (i: number) => void;
  tone: Tone;
}) {
  const light = tone === "light";
  return (
    <div className="fixed right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 sm:right-5 lg:right-8">
      {Array.from({ length: count }, (_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Go to page ${i + 1}`}
            aria-current={active ? "page" : undefined}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${FOCUS_RING}`}
          >
            <span
              className={`block h-3 w-3 rounded-full transition-[transform,background-color,box-shadow] duration-300 ${
                active
                  ? // A hairline keeps the lime dot visible on the white page.
                    `bg-parrot-lime ${light ? "shadow-[0_0_0_1px_#1a1a1a]" : ""}`
                  : `scale-[0.62] ${light ? "bg-[#71717A] hover:bg-[#4a4a4a]" : "bg-parrot-muted-2 hover:bg-parrot-muted"}`
              }`}
              style={{ transitionTimingFunction: EASE_PREMIUM }}
            />
          </button>
        );
      })}
      <span
        className={`mt-1 text-[11px] tabular-nums transition-colors duration-300 sm:text-[12px] ${
          light ? "text-[#4a4a4a]" : "text-parrot-muted"
        }`}
        aria-live="polite"
      >
        {index + 1} / {count}
      </span>
    </div>
  );
}
