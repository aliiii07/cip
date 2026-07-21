import { Simulated } from "./Badge";

export function MetricCard({
  label,
  value,
  hero = false,
  sub,
}: {
  label: string;
  value: string;
  hero?: boolean;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label text-dim">{label}</span>
        <Simulated />
      </div>
      <div
        className={`font-mono tabular-nums ${hero ? "text-4xl text-accent glow" : "text-xl"}`}
      >
        {value}
      </div>
      {sub ? <div className="label mt-1 text-dim">{sub}</div> : null}
    </div>
  );
}
