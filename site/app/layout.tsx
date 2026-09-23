import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PointerGlowField } from "@/components/PointerGlowField";
import "./globals.css";

/**
 * The deck is set in Helvetica Neue. We ask for it first and fall back to
 * Inter (loaded here) so the type stays a neo-grotesque everywhere, including
 * the prototype, which aliases its own --font-terminal variable to this same
 * Inter instance rather than loading a second family.
 */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-fallback",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CIP · Capital Investment Prospects",
  description:
    "Build your own strategy or follow an expert. Nothing reaches you untested: every strategy passes the same verification first. Paper-trading only, on real data.",
  metadataBase: new URL("https://netcip.com"),
  openGraph: {
    title: "CIP · Capital Investment Prospects",
    description:
      "Follow the proven, not just the famous. Every strategy verified before you trust it.",
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
