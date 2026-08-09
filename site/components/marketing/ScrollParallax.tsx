"use client";

import type { ReactNode } from "react";
import { useScrollProgress } from "@/lib/useScrollProgress";

/**
 * Thin client wrapper so server-rendered marketing sections can opt a single
 * element into scroll-linked drift (see globals.css: .parallax-slow/-fast/-fade)
 * without becoming client components themselves.
 */
export function ScrollParallax({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useScrollProgress<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
