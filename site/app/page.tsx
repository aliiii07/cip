import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksScroll } from "@/components/landing/HowItWorksScroll";
import { PartnerGrid } from "@/components/landing/PartnerGrid";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { InvestingBand } from "@/components/landing/InvestingBand";
import { SiteFooter } from "@/components/landing/SiteFooter";

/**
 * The landing page.
 *
 * Order is fixed and load-bearing: the calculator sits after security, not
 * under the hero, so a reader meets the verification argument before any
 * modelled figure. Surfaces alternate black / #1F1F1F rather than dropping a
 * light slab into the middle of the dark run.
 *
 * Figtree is opted into here via `font-body`; it is not the global face, so
 * the prototype at /prototype keeps its own typography untouched.
 */
export default function Home() {
  return (
    <div className="bg-true-black font-body">
      <NavBar />
      <main>
        <HeroSection />
        <HowItWorksScroll />
        <PartnerGrid />
        <SecuritySection />
        <RoiCalculator />
        <FaqAccordion />
        <InvestingBand />
      </main>
      <SiteFooter />
    </div>
  );
}
