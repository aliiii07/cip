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

/**
 * Canvas and chart text need a real font family string; a CSS var() does not
 * resolve in a 2D context. This reads the site's Figtree instance (declared
 * by next/font on <html> under a generated family name) so canvases, charts
 * and the page share one face. Resolved once, on the client.
 */
let resolvedFont: string | null = null;
export function siteFont(): string {
  if (resolvedFont) return resolvedFont;
  if (typeof window === "undefined") return TERMINAL_FONT;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-figtree").trim();
  resolvedFont = v ? `${v}, ${TERMINAL_FONT}` : TERMINAL_FONT;
  return resolvedFont;
}

export const TERMINAL_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
