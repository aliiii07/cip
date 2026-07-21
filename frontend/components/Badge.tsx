export function Badge({ children, tone }: { children: React.ReactNode; tone?: "accent" | "ok" }) {
  const color =
    tone === "accent" ? "text-accent border-accent" : tone === "ok" ? "text-ok border-ok" : "";
  return <span className={`badge ${color}`}>{children}</span>;
}

export const Simulated = () => <Badge tone="accent">Simulated</Badge>;
export const StubData = () => <Badge>Stub data</Badge>;
