import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

/**
 * The deck is set in Helvetica Neue. We ask for it first and fall back to Inter
 * (loaded here) so the type stays a neo-grotesque everywhere.
 */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-fallback",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body
        style={
          {
            // Helvetica Neue where it exists; Inter everywhere else.
            "--font-sans": `"Helvetica Neue", var(--font-sans-fallback), Helvetica, Arial, sans-serif`,
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
