import { SimulatedBadge } from "./Badge";

export function StatCard({
  label,
  value,
  hero = false,
  simulated = true,
  sub,
  tone,
}: {
  label: string;
  value: string;
  hero?: boolean;
  simulated?: boolean;
  sub?: string;
  tone?: "ok" | "warn" | "fail";
}) {
  const toneClass =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "fail" ? "text-fail" : "";
  return (
    <div className={`stat-card ${hero ? "stat-hero" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="stat-label">{label}</span>
        {simulated ? <SimulatedBadge /> : null}
      </div>
      <div className={`stat-value ${hero ? "text-2xl text-accent" : ""} ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-secondary">{sub}</div> : null}
    </div>
  );
}

