/**
 * The CIP mark: a white breakout line ascending left→right, terminating in a
 * crimson dot at the peak. Traced from the master artwork on a 1200×1200 grid
 * so the two variants stay in register with each other.
 *
 * Inline SVG (not an <img>) so the dot inherits --signal and the hero can
 * animate the stroke.
 */

const LINE = "M292 818 L470 880 L645 592 L818 668 L900 452";
const DOT = { cx: 905, cy: 375, r: 68 };

export function LogoMark({
  className,
  animate = false,
  title = "CIP",
}: {
  className?: string;
  animate?: boolean;
  title?: string;
}) {
  return (
    <svg
      viewBox="248 292 742 630"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <path
        d={LINE}
        stroke="currentColor"
        strokeWidth={46}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "mark-line" : undefined}
      />
      <circle
        cx={DOT.cx}
        cy={DOT.cy}
        r={DOT.r}
        fill="var(--signal)"
        className={animate ? "mark-dot" : undefined}
      />
    </svg>
  );
}

/** Full app-icon lockup: the mark on a black rounded square. */
export function LogoSquare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 1200" className={className} role="img" aria-label="CIP">
      <rect width="1200" height="1200" rx="232" fill="#0A0A0A" />
      <path
        d={LINE}
        stroke="#FFFFFF"
        strokeWidth={46}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill="var(--signal, #E23B3B)" />
    </svg>
  );
}
