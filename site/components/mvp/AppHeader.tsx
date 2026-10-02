import Link from "next/link";
import { CipMark } from "@/components/parrot/ParrotLogo";
import { BRAND } from "@/lib/parrot-content";
import { FOCUS_RING } from "./styles";

/**
 * Thin fixed chrome for the app: the mark and the name on the left, one way
 * back to the site on the right. Same dark and the same blur the landing nav
 * takes once scrolled, so crossing from one to the other changes nothing.
 */
export function AppHeader({ back = { href: "/", label: "Back to site" } }: { back?: { href: string; label: string } }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/[0.06] bg-parrot-dark/80 backdrop-blur-[6px]">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          aria-label="C.I.P home"
          className={`inline-flex items-center gap-2.5 rounded-md text-white ${FOCUS_RING}`}
        >
          <CipMark className="h-[22px] w-[26px]" animate={false} />
          <span className="font-display text-[20px] font-semibold leading-none tracking-[-0.5px]">
            {BRAND.name}
          </span>
        </Link>

        <Link
          href={back.href}
          className={`inline-flex items-center gap-1.5 rounded-md py-1 text-[14px] font-medium text-parrot-muted transition-colors duration-200 hover:text-white ${FOCUS_RING}`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
            <path
              d="M9.5 3.5 5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {back.label}
        </Link>
      </div>
    </header>
  );
}
