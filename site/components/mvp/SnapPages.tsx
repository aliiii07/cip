"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EASE_PREMIUM, prefersReducedMotion } from "@/lib/motion";
import { FOCUS_RING } from "./styles";

/* ---- tuning -------------------------------------------------------------
 * The feel of the pager lives in these five numbers.
 */

/** Slide duration. Input is ignored only while a slide is running. */
const SLIDE_MS = 500;
/** Wheel travel (px) accumulated within one gesture that turns the page. */
const GESTURE_PX = 40;
/** Silence (ms) between wheel events that ends a gesture; the next event starts a new one. */
const GESTURE_GAP_MS = 150;
/** One event at or above this (px) is a mouse wheel notch and turns the page by itself. */
const NOTCH_PX = 50;
/** Touch swipe distance (px) that turns the page. */
const SWIPE_MIN = 40;

/** Line based wheels (deltaMode 1) report lines; this converts them to pixels. */
const LINE_PX = 16;

/** Lets a page move the stack, e.g. picking a company on page 1 opens page 2. */
interface SnapNav {
  index: number;
  count: number;
  go: (index: number) => void;
}

const SnapContext = createContext<SnapNav | null>(null);

export function useSnap(): SnapNav {
  const value = useContext(SnapContext);
  if (!value) throw new Error("useSnap must be used inside SnapPages");
  return value;
}

/**
 * A fixed stack of screen tall pages with one gesture per page.
 *
 * The track slides by whole pages; there is no free scrolling anywhere. A
 * wheel gesture is the run of wheel events with no gap longer than
 * GESTURE_GAP_MS between them. The page turns as soon as the gesture's travel
 * passes GESTURE_PX, without waiting for it to end, and the rest of that
 * gesture, which on a trackpad is the inertia tail, is ignored. A new gesture
 * begins after the gap, or when the deltas start rising again after the tail
 * has decayed, which is a second swipe made before the first tail died. One
 * mouse wheel notch is a single large event and turns the page at once. The
 * only lock is the slide itself. Under reduced motion the switch is instant.
 */

/** Wheel events that belong together, and whether they have already paged. */
interface Gesture {
  acc: number;
  lastT: number;
  /** Smallest delta seen since the gesture paged; a delta well above it is a new push. */
  trough: number;
  done: boolean;
}

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

  const animating = useRef(false);
  const animTimer = useRef(0);
  const gesture = useRef<Gesture>({ acc: 0, lastT: 0, trough: Infinity, done: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  const go = useCallback(
    (next: number) => {
      if (animating.current) return;
      const target = Math.max(0, Math.min(count - 1, next));
      if (target === indexRef.current) return;
      indexRef.current = target;
      setIndex(target);
      animating.current = true;
      window.clearTimeout(animTimer.current);
      animTimer.current = window.setTimeout(() => {
        animating.current = false;
      }, reduced ? 0 : SLIDE_MS);
    },
    [count, reduced]
  );

  useEffect(() => {
    // On the window, not the track: the fixed header sits beside the track,
    // and a wheel over it should page too. Native and non passive, because
    // React registers wheel listeners as passive and would drop the
    // preventDefault that keeps the browser from scrolling anything itself.
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const now = performance.now();
      const g = gesture.current;

      // Content that scrolls on its own inside a page scrolls first; the
      // page turns only on a later gesture once that content is at its edge.
      const inner = scrollableWithin(e.target as Element | null, containerRef.current);
      if (inner && canScroll(inner, dy)) {
        g.done = true;
        g.lastT = now;
        return;
      }
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const abs = Math.abs(dy);
      const fresh =
        now - g.lastT > GESTURE_GAP_MS ||
        (g.done && abs > g.trough * 2 + 6) ||
        (g.acc !== 0 && Math.sign(dy) !== Math.sign(g.acc));
      if (fresh) {
        g.acc = 0;
        g.done = false;
        g.trough = Infinity;
      }
      g.lastT = now;
      if (g.done) {
        g.trough = Math.min(g.trough, abs);
        return;
      }
      if (animating.current) {
        // A swipe during the slide is spent, tail included.
        g.done = true;
        g.trough = abs;
        return;
      }
      g.acc += dy;
      if (Math.abs(g.acc) >= GESTURE_PX || abs >= NOTCH_PX || e.deltaMode === 1) {
        g.done = true;
        g.trough = abs;
        go(indexRef.current + (dy > 0 ? 1 : -1));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go]);

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
        case " ":
          next = indexRef.current + (e.shiftKey ? -1 : 1);
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

  useEffect(() => () => window.clearTimeout(animTimer.current), []);

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
    <SnapContext.Provider value={{ index, count, go }}>
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
        data-snap-track
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
    </SnapContext.Provider>
  );
}

/** The nearest element between `start` and `root` that scrolls vertically. */
function scrollableWithin(start: Element | null, root: HTMLElement | null): HTMLElement | null {
  let el: Element | null = start;
  while (el && el !== root) {
    if (el instanceof HTMLElement) {
      const { overflowY } = getComputedStyle(el);
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
    }
    el = el.parentElement;
  }
  return null;
}

function canScroll(el: HTMLElement, dy: number): boolean {
  return dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
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
