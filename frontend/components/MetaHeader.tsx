import { VERSION } from "@/lib/constants";

export function MetaHeader({ page, index, total }: { page: string; index: number; total: number }) {
  const cells: [string, string][] = [
    ["Project", "CIP — Capital Investment Prospects"],
    ["System", "Paper sandbox"],
    ["Version", VERSION],
    ["Page", `${page} · ${index}/${total}`],
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 border-b border-line pb-3 md:grid-cols-4">
      {cells.map(([k, v]) => (
        <div key={k}>
          <div className="label text-dim">{k}</div>
          <div className="label">{v}</div>
        </div>
      ))}
    </div>
  );
}
