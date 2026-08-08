import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { About, Hero, Positioning, Problem } from "@/components/marketing/SectionsTop";
import {
  DeathTraps,
  Honesty,
  Numbers,
  Pipeline,
  WhatWeDo,
} from "@/components/marketing/SectionsMid";
import {
  FinalCta,
  Opportunity,
  Pricing,
  Roadmap,
  Status,
  Vision,
} from "@/components/marketing/SectionsEnd";

/**
 * The landing page is the deck, unrolled vertically. Each section is one slide:
 * one idea, a lot of negative space, and the crimson used once or not at all.
 * The ink → paper → ink alternation is the deck's rhythm, not decoration.
 */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Problem />
        <Positioning />
        <WhatWeDo />
        <Pipeline />
        <Honesty />
        <DeathTraps />
        <Numbers />
        <Status />
        <Opportunity />
        <Pricing />
        <Roadmap />
        <Vision />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
