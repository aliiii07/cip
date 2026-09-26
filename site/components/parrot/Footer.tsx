"use client";

import { ParrotLogo } from "./ParrotLogo";
import { BRAND, FOOTER } from "@/lib/parrot-content";

/** Two stacked footers: download + newsletter on white, legal on dark. */
export function Footer() {
  return (
    <>
      <footer className="border-t border-[#E4E4E7] bg-white py-16 lg:min-h-[327px]">
        <div className="mx-auto flex max-w-[1580px] flex-col gap-12 px-6 lg:flex-row lg:items-start lg:justify-between lg:px-[60px]">
          <div>
            <ParrotLogo tone="dark" />
          </div>

          <form className="w-full max-w-[420px]" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="pf-email" className="font-display text-[18px] font-medium text-[#1a1a1a]">
              {FOOTER.stay}
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="pf-email"
                type="email"
                placeholder="Email address"
                className="h-12 flex-1 rounded-[80px] border border-[#1a1a1a] bg-transparent px-5 font-body text-[15px] text-[#1a1a1a] outline-none placeholder:text-[#8a8a8a]"
              />
              <button
                type="submit"
                className="h-12 rounded-[80px] bg-parrot-black px-6 font-display text-[15px] font-medium text-white transition-transform hover:scale-[1.03]"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </footer>

      <footer className="bg-parrot-dark py-14 lg:min-h-[327px]">
        <div className="mx-auto flex max-w-[1580px] flex-col gap-8 px-6 lg:px-[60px]">
          <nav className="flex flex-wrap gap-x-10 gap-y-3" aria-label="Legal">
            {FOOTER.links.map((l) => (
              <a key={l} href="#legal" className="font-body text-[15px] text-[#A1A1AA] transition-colors hover:text-white">
                {l}
              </a>
            ))}
            <a href="#partner" className="font-body text-[15px] text-[#A1A1AA] transition-colors hover:text-white">
              {FOOTER.partner}
            </a>
          </nav>
          <p className="font-body text-[14px] text-[#A1A1AA]">
            Contact us at{" "}
            <a href={`mailto:${BRAND.email}`} className="text-white underline underline-offset-4">
              {BRAND.email}
            </a>
          </p>
          <p className="font-body text-[14px] text-[#71717A]">{FOOTER.copyright}</p>
        </div>
      </footer>
    </>
  );
}
