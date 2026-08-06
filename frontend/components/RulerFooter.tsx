import { DISCLAIMER } from "@/lib/constants";

export function RulerFooter() {
  return (
    <footer className="mt-12 border-t border-line pt-3">
      <div
        aria-hidden
        className="mb-3 flex h-3 items-end justify-between overflow-hidden"
      >
        {Array.from({ length: 51 }).map((_, i) => (
          <span
            key={i}
            className="w-px bg-line"
            style={{ height: i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 4 }}
          />
        ))}
      </div>
      <p className="label text-dim">{DISCLAIMER}</p>
    </footer>
  );
}
