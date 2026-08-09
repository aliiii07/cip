"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

const LINKS = [
  ["Product", "/#what-we-do"],
  ["How it works", "/#pipeline"],
  ["Honesty", "/#honesty"],
  ["Prototype", "/prototype"],
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-ink/92 backdrop-blur-md border-b border-hairline" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-deck items-center gap-4 px-[var(--gutter)]">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CIP home">
          <LogoMark className="h-6 w-8 text-white" />
          <span className="text-[13px] tracking-[0.18em]">CIP</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-7 lg:flex">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="nav-link text-[13px] text-[#b0b0b0]">
              {label}
            </Link>
          ))}
        </nav>

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
          className="ml-auto flex h-9 w-9 items-center justify-center md:hidden"
        >
          <span className="relative block h-[9px] w-5">
            <span
              className={`absolute left-0 block h-px w-5 bg-white transition-transform ${
                open ? "top-1 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-5 bg-white transition-transform ${
                open ? "top-1 -rotate-45" : "top-2"
              }`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div className="panel-open border-t border-hairline bg-ink px-[var(--gutter)] py-5 md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-[15px] text-[#cfcfcf]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
