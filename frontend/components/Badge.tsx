export const SimulatedBadge = () => <span className="badge-simulated">SIMULATED</span>;

export const PaperBadge = () => (
  <span className="badge-paper">Paper session · live data</span>
);

export function StubDataNotice({ detail }: { detail: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-secondary">
      <span
        aria-hidden
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line-strong text-[9px]"
      >
        i
      </span>
      Stub data — {detail}
    </p>
  );
}

const SIGNAL_STYLES: Record<string, string> = {
  breakout: "bg-ok-bg text-ok",
  momentum: "bg-ok-bg text-ok",
  trend_continuation: "bg-ok-bg text-ok",
  pullback: "bg-accent-bg text-accent",
  reversal: "bg-warn-bg text-warn",
};

export function SignalBadge({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-medium ${SIGNAL_STYLES[type] ?? "bg-bg text-secondary"}`}
    >
      {label}
    </span>
  );
}
