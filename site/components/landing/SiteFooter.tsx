import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { DISCLAIMER } from "@/lib/constants";

/**
 * Two stacked footers, as the layout calls for.
 *
 * The disclaimer is the schema-pinned string from lib/constants, printed
 * verbatim. docs/handoff.md records it as pinned, so it is imported rather
 * than retyped: a hand-written marketing variant here would drift from the
 * one the product shows on every modelled figure.
 *
 * No Form ADV or CRS links: CIP is not a registered adviser and pointing at
 * filings that do not exist would be worse than omitting them.
 */

const PRIMARY = [
  ["Privacy", "/legal"],
  ["Terms", "/legal"],
  ["Disclaimer", "/legal"],
  ["Prototype", "/prototype"],
] as const;

const SECONDARY = [
  ["How It Works", "#how-it-works"],
  ["Verified Strategies", "#verified"],
  ["FAQ", "#faq"],
  ["About", "/about"],
] as const;

/** Four original marks, drawn inline. */
const ICONS = [
  { label: "Verified", d: "M12 3 l8 3v6c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6z M8.5 12 l2.5 2.5 l5-5.5" },
  { label: "Data", d: "M4 19V9 M9.5 19V5 M15 19v-7 M20.5 19v-11" },
  { label: "Paper", d: "M6 3h8l4 4v14H6z M14 3v4h4" },
  { label: "Review", d: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M16 16l4 4" },
];

export function SiteFooter() {
  return (
    <>
      <footer className="flex min-h-[327px] items-center bg-pure-black py-16">
        <div className="mx-auto w-full max-w-content px-6 lg:px-0">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark className="h-6 w-8 text-white" />
                <span className="font-display text-[20px] font-semibold tracking-[-0.5px] text-white">
                  C.I.P
                </span>
              </div>
              <p className="mt-4 max-w-[34ch] font-body text-[14px] leading-relaxed text-text-dark-muted">
                Build your own strategy or follow an expert. Nothing reaches
                you untested.
              </p>
              <a
                href="mailto:hello@netcip.com"
                className="mt-4 inline-block font-body text-[14px] text-titanium-light underline underline-offset-4"
              >
                hello@netcip.com
              </a>
            </div>

            <nav className="grid grid-cols-2 gap-x-14 gap-y-3">
              {PRIMARY.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="font-body text-[14px] text-text-dark-muted transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <p className="mt-12 border-t border-dark-border pt-8 font-body text-[13px] font-light leading-relaxed text-text-light-muted">
            {DISCLAIMER}
          </p>
        </div>
      </footer>

      <footer className="flex min-h-[327px] items-center bg-dark-bg-2 py-16">
        <div className="mx-auto w-full max-w-content px-6 lg:px-0">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <nav className="flex flex-wrap gap-x-10 gap-y-3">
              {SECONDARY.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="font-body text-[14px] text-text-dark-muted transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <ul className="flex gap-5" aria-hidden>
              {ICONS.map((i) => (
                <li
                  key={i.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-dark-border"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="#9F9D9B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={i.d} />
                  </svg>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-12 font-body text-[13px] font-light text-text-light-muted">
            © {new Date().getFullYear()} C.I.P · Pre-seed · netcip.com · Paper
            trading only, no live brokerage.
          </p>
        </div>
      </footer>
    </>
  );
}
