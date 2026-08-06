"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["Portfolio", "/"],
  ["Screener", "/screener"],
  ["Scanner", "/scanner"],
  ["Strategy builder", "/build"],
  ["Variant lab", "/lab"],
  ["Decisions", "/decisions"],
  ["Monitor", "/monitor"],
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-row gap-0.5 overflow-x-auto border-b border-line-strong bg-rail p-2 md:min-h-full md:w-[220px] md:flex-col md:border-b-0 md:border-r md:p-3">
      <div className="mb-4 hidden px-2 pt-1 md:block">
        <div className="text-lg font-semibold tracking-tight">CIP</div>
        <div className="text-[11px] text-secondary">Capital Investment Prospects</div>
      </div>
      {ITEMS.map(([name, href]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex h-9 items-center whitespace-nowrap rounded-md px-4 text-[13px] ${
              active
                ? "border-l-2 border-accent bg-surface font-medium text-ink"
                : "text-secondary hover:bg-surface hover:text-ink"
            }`}
          >
            {name}
          </Link>
        );
      })}
    </nav>
  );
}
