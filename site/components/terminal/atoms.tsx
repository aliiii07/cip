import type { ReactNode } from "react";
import type { Verdict } from "@/lib/types";
import { APPROVAL_BANNER, DISCLAIMER } from "@/lib/constants";

/** Wraps or captions every simulated figure. Non-negotiable. */
export function SimulatedBadge({ label = "Simulated" }: { label?: string }) {
  return <span className="badge-sim">{label}</span>;
}

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`t-panel ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--hair)] px-4 py-2.5">
        <h2 className="t-label">{title}</h2>
        {aside ? <div className="flex items-center gap-2">{aside}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "red" | "amber";
  hint?: string;
}) {
  const color =
    tone === "green"
      ? "var(--green-d)"
      : tone === "red"
        ? "var(--red-d)"
        : tone === "amber"
          ? "#8a6f14"
          : "var(--t-ink)";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--hair)] py-[7px] last:border-0">
      <span className="t-label">{label}</span>
      <span className="t-value text-right" style={{ color }} title={hint}>
        {value}
      </span>
    </div>
  );
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const cls =
    verdict === "approved"
      ? "v-approved"
      : verdict === "rejected"
        ? "v-rejected"
        : "v-marginal";
  return <span className={`verdict ${cls}`}>{verdict}</span>;
}

export function ApprovalBanner() {
  return (
    <div
      className="rounded-[3px] border px-4 py-3 text-[11.5px] leading-relaxed"
      style={{
        borderColor: "rgba(158,75,71,0.32)",
        background: "rgba(158,75,71,0.06)",
        color: "var(--red-d)",
      }}
    >
      {APPROVAL_BANNER}
    </div>
  );
}

export function TerminalDisclaimer({ simulated }: { simulated: boolean }) {
  return (
    <div className="space-y-1.5 border-t border-[var(--hair)] pt-4 text-[10.5px] leading-relaxed text-[var(--t-muted)]">
      <p>{DISCLAIMER}</p>
      {simulated ? (
        <p>
          Market data for this asset is deterministic sample data, not an
          exchange feed. Every figure on this page is simulated.
        </p>
      ) : (
        <p>
          Strategy results are simulated on real market data. No order was
          placed and no position exists.
        </p>
      )}
    </div>
  );
}

export function fmt(n: number | null | undefined, dp = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function pct(n: number | null | undefined, dp = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(dp)}%`;
}
