export function Stamp({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "ok" | "fail";
}) {
  const cls = tone === "ok" ? "stamp stamp-ok" : tone === "fail" ? "stamp stamp-fail" : "stamp";
  return <span className={cls}>{children}</span>;
}
