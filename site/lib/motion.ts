/**
 * Shared motion utilities. No animation library — everything here is either a
 * CSS custom property nudge or a requestAnimationFrame loop, gated the same
 * way everywhere: pause off-screen, skip entirely under reduced motion, cap
 * device pixel ratio. That's the whole performance budget.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/** The one easing curve used everywhere motion happens on this site. */
export const EASE_PREMIUM = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Canvas text needs a real font name string; CSS var() does not resolve in a
 *  2D context. Matches the marketing site's typeface so the prototype reads
 *  as the same product, not a separate app dropped into an iframe. */
export const TERMINAL_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
