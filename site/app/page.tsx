import type { Metadata } from "next";
import { Navbar } from "@/components/parrot/Navbar";
import { Hero } from "@/components/parrot/Hero";
import { HowItWorks } from "@/components/parrot/HowItWorks";
import { AccessCubes } from "@/components/parrot/AccessCubes";
import { Security } from "@/components/parrot/Security";
import { GrowthCalculator } from "@/components/parrot/GrowthCalculator";
import { Faq } from "@/components/parrot/Faq";
import { Footer } from "@/components/parrot/Footer";
import { BRAND, HERO } from "@/lib/parrot-content";

/**
 * Homepage: a clone of parrotfinance.io kept as a design template. All copy,
 * figures and branding come from lib/parrot-content.ts and are placeholders
 * for the rebrand. The previous landing (components/landing/*) is untouched
 * and still importable; the prototype at /prototype is not affected.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.fullName}`,
  description: HERO.sub,
};

export default function Home() {
  return (
    <div className="pf-root">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AccessCubes />
        <Security />
        <GrowthCalculator />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
