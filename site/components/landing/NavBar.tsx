"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";

/**
 * Fixed 94px chrome. Deliberately `position: fixed` and opaque rather than a
 * sticky offset bar: the hero's arc and badge scroll underneath it, and a
 * translucent nav over that artwork turns the wordmark to mush.
 */
const LINKS = [
  ["How It Works", "#how-it-works"],
  ["Verified Strategies", "#verified"],
  ["FAQ", "#faq"],
] as const;

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[94px] bg-pure-black">
      <div className="mx-auto flex h-full max-w-content items-center gap-8 px-6 lg:px-0">
        <Link href="/" className="flex items-center gap-3" aria-label="CIP home">
          <LogoMark className="h-6 w-8 text-white" />
          <span className="font-display text-[20px] font-semibold tracking-[-0.5px] text-white">
            CIP
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-9 lg:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="font-display text-[20px] font-medium text-text-dark-muted transition-colors duration-200 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <span className="flex-1" />

        {/* The pill keeps its full size on mobile; only the links collapse. */}
        <Link
          href="/prototype"
          className="hidden rounded-[80px] bg-white px-5 py-4 font-display text-[20px] font-medium leading-none text-pure-black transition-transform duration-200 hover:scale-[1.03] sm:inline-block"
        >
          Start on paper
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
          className="flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <span className="relative block h-[10px] w-6">
            <span
              className={`absolute left-0 block h-px w-6 bg-white transition-transform duration-200 ${
                open ? "top-[5px] rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-6 bg-white transition-transform duration-200 ${
                open ? "top-[5px] -rotate-45" : "top-[9px]"
              }`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-dark-border bg-pure-black px-6 py-6 lg:hidden">
          <nav className="flex flex-col gap-5">
            {LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="font-display text-[20px] font-medium text-white"
              >
                {label}
              </a>
            ))}
            <Link
              href="/prototype"
              onClick={() => setOpen(false)}
              className="mt-1 self-start rounded-[80px] bg-white px-5 py-4 font-display text-[20px] font-medium leading-none text-pure-black sm:hidden"
            >
              Start on paper
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
