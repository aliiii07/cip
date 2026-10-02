import type { Metadata } from "next";
import { Figtree, Inter } from "next/font/google";
import { PointerGlowField } from "@/components/PointerGlowField";
import { SmoothScroll } from "@/components/motion";
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

/**
 * Figtree is the landing page's face. It is declared here so Next can host
 * and preload it, but deliberately NOT applied to <body>: the landing opts in
 * through `font-display` / `font-body`, which keeps the prototype and the
 * older deck sections on their own type. Changing the global face here would
 * silently restyle the terminal.
 */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "C.I.P · Capital Investment Prospects",
  description:
    "Build your own strategy or follow an expert. Nothing reaches you untested: every strategy passes the same verification first. Paper-trading only, on real data.",
  metadataBase: new URL("https://netcip.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "C.I.P · Capital Investment Prospects",
    description:
      "Follow the proven, not just the famous. Every strategy verified before you trust it.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${figtree.variable}`}>
      <body
        style={
          {
            // Helvetica Neue where it exists; Inter everywhere else.
            "--font-sans": `"Helvetica Neue", var(--font-sans-fallback), Helvetica, Arial, sans-serif`,
          } as React.CSSProperties
        }
      >
        <SmoothScroll />
        <PointerGlowField />
        {children}
      </body>
    </html>
  );
}
