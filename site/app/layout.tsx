import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PointerGlowField } from "@/components/PointerGlowField";
import "./globals.css";

/**
 * The deck is set in Helvetica Neue. We ask for it first and fall back to Inter
 * (loaded here) so the type stays a neo-grotesque everywhere. The prototype
 * route loads its own typeface (Nunito, --font-terminal) in its own layout —
 * the two identities stay deliberately separate, per the two-surface system.
 */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-fallback",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CIP — Capital Investment Prospects",
  description:
    "CIP turns a simple choice into a tested, risk-managed strategy. Pick a market, an asset, a timeframe — four specialists do the rest. Paper-trading only, on real data.",
  metadataBase: new URL("https://cip.example"),
  openGraph: {
    title: "CIP — Capital Investment Prospects",
    description:
      "The younger Bloomberg. Automatic where Bloomberg is manual, at a small fraction of the cost.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body
        style={
          {
            // Helvetica Neue where it exists; Inter everywhere else.
            "--font-sans": `"Helvetica Neue", var(--font-sans-fallback), Helvetica, Arial, sans-serif`,
          } as React.CSSProperties
        }
      >
        <PointerGlowField />
        {children}
      </body>
    </html>
  );
}
