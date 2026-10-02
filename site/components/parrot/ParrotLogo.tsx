import { BRAND } from "@/lib/parrot-content";

/**
 * The CIP mark: the rising zigzag line ending in a dot, the same geometry as
 * components/Logo.tsx (traced on a 1200 grid), with the dot in the lime the
 * hero arc nodes already use. Inline SVG so it stays sharp at any size and
 * the line can draw itself on page load (.mark-line / .mark-dot in
 * globals.css: 1.35s expo-out draw, dot pops at 1.2s, both skipped under
 * prefers-reduced-motion). Transparent background; the line takes
 * currentColor so it is white on dark surfaces and near black on light ones.
 */
const LINE = "M292 818 L470 880 L645 592 L818 668 L900 452";
const DOT = { cx: 905, cy: 375, r: 68 };
const LIME = "#C6F04A";

export function CipMark({
  className = "h-8 w-[38px]",
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg viewBox="248 292 742 630" className={className} role="img" aria-label="C.I.P" fill="none">
      <path
        d={LINE}
        stroke="currentColor"
        strokeWidth={46}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "mark-line" : undefined}
      />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={LIME} className={animate ? "mark-dot" : undefined} />
    </svg>
  );
}

/** Static variant for small in-page uses (e.g. the calculator card). */
export function ParrotMark({ className = "h-7 w-8" }: { className?: string }) {
  return <CipMark className={className} animate={false} />;
}

export function ParrotLogo({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${tone === "light" ? "text-white" : "text-[#1a1a1a]"} ${className}`}
    >
      <CipMark />
      <span className="font-display text-[30px] font-semibold leading-none tracking-[-1px]">
        {BRAND.name}
      </span>
    </span>
  );
}
