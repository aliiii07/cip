import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NASDAQ 50 · CIP",
  description:
    "Pick any of 50 top NASDAQ companies and research it in seconds. Live market data. Not investment advice.",
};

/**
 * The app surface. Figtree, the landing hero's dark and white text, and the
 * landing's lime for selection, so the page reads as the same product as the
 * site it was launched from. Everything inside is fixed to the viewport; this
 * wrapper only carries the inherited type and colour.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-parrot-dark font-body text-white selection:bg-[#B2F200] selection:text-[#0A0A0A]">
      {children}
    </div>
  );
}
