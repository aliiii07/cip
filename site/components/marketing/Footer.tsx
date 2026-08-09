import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { DISCLAIMER, STAGE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-ink px-[var(--gutter)] py-14">
      <div className="mx-auto max-w-deck">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-8 text-white" />
              <span className="text-[13px] tracking-[0.18em]">CIP</span>
            </div>
            <p className="mt-3 max-w-[30ch] text-[13px] leading-relaxed text-muted">
              Capital Investment Prospects. Built in Uzbekistan for
              emerging-market investors.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-14 gap-y-2.5 text-[13px] sm:grid-cols-3">
            {[
              ["Product", "/#what-we-do"],
              ["How it works", "/#pipeline"],
              ["Honesty", "/#honesty"],
              ["Prototype", "/prototype"],
              ["About", "/about"],
              ["Legal", "/legal"],
              ["Contact", "/#contact"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-[#a8a8a8] transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <hr className="rule my-9" />

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[78ch] text-[12px] leading-relaxed text-muted-2">
            {DISCLAIMER}
          </p>
          <p className="slide-no shrink-0">{STAGE}</p>
        </div>
      </div>
    </footer>
  );
}
