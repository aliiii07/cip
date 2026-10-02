"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ParrotLogo } from "./ParrotLogo";
import { NAV, NAV_CTA } from "@/lib/parrot-content";

/**
 * Fixed 94px chrome. Transparent over the top of the hero; once the reader
 * scrolls it takes a subtle dark, blurred background so the links stay
 * readable over whatever passes underneath. Links collapse into a menu on
 * mobile.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const pill =
    "rounded-[80px] bg-white px-7 py-4 font-display text-[20px] font-medium leading-none text-parrot-black transition-transform duration-200 hover:scale-[1.03]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[94px] transition-colors duration-300 ${
        scrolled || open ? "bg-parrot-dark/70 backdrop-blur-[6px]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1580px] items-center px-6 lg:px-[60px]">
        <Link href="/" aria-label="C.I.P home">
          <ParrotLogo />
        </Link>

        <span className="flex-1" />

        <nav className="hidden items-center gap-10 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-[20px] font-medium text-white transition-opacity duration-200 hover:opacity-70"
            >
              {item.label}
            </Link>
          ))}
          <Link href={NAV_CTA.href} className={pill}>
            {NAV_CTA.label}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
          className="flex h-11 w-11 items-center justify-center lg:hidden"
        >
          <span className="relative block h-[12px] w-7">
            <span
              className={`absolute left-0 block h-[2px] w-7 bg-white transition-transform duration-200 ${
                open ? "top-[5px] rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 block h-[2px] w-7 bg-white transition-transform duration-200 ${
                open ? "top-[5px] -rotate-45" : "top-[10px]"
              }`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-[94px] h-[calc(100vh-94px)] bg-parrot-dark px-6 py-8 lg:hidden">
          <nav className="flex flex-col gap-6" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-[26px] font-medium text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link href={NAV_CTA.href} onClick={() => setOpen(false)} className={`mt-2 self-start ${pill}`}>
              {NAV_CTA.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
