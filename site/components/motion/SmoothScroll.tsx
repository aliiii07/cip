"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Lenis, mounted once at the app root.
 *
 * Two things this deliberately does not do.
 *
 * It does not start at all under prefers-reduced-motion. Smooth scrolling is
 * exactly the kind of motion that setting exists to remove, and easing the
 * viewport is worse for that reader than a slide or a fade, because it
 * affects every interaction rather than one element.
 *
 * It does not fight CSS. `scroll-behavior: smooth` in globals.css and a
 * scroll-hijacking library both animating the same scroll position produces
 * a visible double ease on every anchor jump, so the CSS rule is suspended
 * for as long as Lenis is running and restored when it tears down.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const lenis = new Lenis({
      duration: 1.05,
      // Expo-out. The same curve as --ease-premium, so scrolling and the
      // element transitions share one motion character.
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch devices already have native momentum; overriding it feels wrong
      // on the platform and costs a frame budget for nothing.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // In-page anchors need to go through Lenis, or the browser jumps the
    // scroll position out from under it and the two desync.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: 0 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.style.scrollBehavior = previousBehavior;
    };
  }, []);

  return null;
}
