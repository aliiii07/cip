import Link from "next/link";
import { AppHeader } from "@/components/mvp/AppHeader";
import { FOCUS_RING } from "@/components/mvp/styles";

export default function CompanyNotFound() {
  return (
    <>
      <AppHeader back={{ href: "/prototype", label: "Back to companies" }} />
      <div className="flex min-h-screen items-center justify-center bg-parrot-dark px-6 pt-14 text-white">
        <div className="max-w-[420px] text-center">
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.5px]">Company not covered</h1>
          <p className="mt-3 text-[15px] leading-snug text-parrot-muted">C.I.P researches 50 NASDAQ companies today. This one is not among them yet.</p>
          <Link href="/prototype" className={`mt-6 inline-block rounded-[80px] bg-white px-7 py-3 font-display text-[16px] font-medium text-parrot-black transition-transform duration-200 hover:scale-[1.03] ${FOCUS_RING}`}>
            See the 50 companies
          </Link>
        </div>
      </div>
    </>
  );
}
