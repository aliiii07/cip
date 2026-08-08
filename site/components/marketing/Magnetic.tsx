"use client";

import { cloneElement, type ReactElement } from "react";
import { useMagnetic } from "@/lib/useMagnetic";

/**
 * Wraps a single interactive child (a Link or button) with the magnetic-hover
 * lean. Kept as a wrapper rather than baked into .btn so it stays optional —
 * plenty of buttons on the page should sit still.
 */
export function Magnetic({
  children,
  strength = 8,
}: {
  children: ReactElement<{ ref?: React.Ref<HTMLElement> }>;
  strength?: number;
}) {
  const ref = useMagnetic<HTMLElement>(strength);
  return (
    <span className="inline-block [transition:transform_0.3s_var(--ease-premium)]">
      {cloneElement(children, { ref })}
    </span>
  );
}
