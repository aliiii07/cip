import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/parrot/Navbar";
import { Footer } from "@/components/parrot/Footer";
import { NAV_CTA } from "@/lib/parrot-content";

export const metadata: Metadata = { title: "Sign up / Log in · C.I.P" };

/** Placeholder until accounts exist. */
export default function LoginPage() {
  return (
    <div className="pf-root">
      <Navbar />
      <main className="flex min-h-[70vh] items-center justify-center bg-parrot-dark px-6 pb-24 pt-[160px]">
        <div className="w-full max-w-[460px] text-center">
          <h1 className="font-display text-[36px] font-semibold tracking-[-1px] text-white lg:text-[48px]">
            Sign up / Log in
          </h1>
          <p className="mt-4 font-body text-[18px] leading-[28px] text-[#A1A1AA]">
            Accounts are coming soon. Until then, everything C.I.P can do is open without one.
          </p>
          <Link
            href={NAV_CTA.href}
            className="mt-8 inline-block rounded-[80px] bg-white px-9 py-4 font-display text-[20px] font-medium leading-none text-parrot-black transition-transform duration-200 hover:scale-[1.03]"
          >
            {NAV_CTA.label}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
