"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["01", "Overview", "/"],
  ["02", "Screener", "/screener"],
  ["03", "Scanner", "/scanner"],
  ["04", "Build", "/build"],
  ["05", "Lab", "/lab"],
  ["06", "Decisions", "/decisions"],
  ["07", "Monitor", "/monitor"],
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-row gap-1 overflow-x-auto border-b border-line p-3 md:min-h-screen md:w-52 md:flex-col md:border-b-0 md:border-r">
      <div className="mb-4 hidden md:block">
        <div className="font-display text-2xl uppercase leading-none glow">CIP</div>
        <div className="label mt-1 text-dim">Quant research sandbox</div>
      </div>
      {ITEMS.map(([num, name, href]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`label whitespace-nowrap px-2 py-1.5 hover:text-accent ${
              active ? "border-l-2 border-accent text-accent" : "text-dim"
            }`}
          >
            {num} {name}
          </Link>
        );
      })}
    </nav>
  );
}
