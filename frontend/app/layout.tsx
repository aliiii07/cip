import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { RulerFooter } from "@/components/RulerFooter";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "CIP — Paper sandbox",
  description:
    "No-code quantitative sandbox: natural-language ideas to typed, backtested, risk-gated strategy specs. Paper trading only.",
};

const themeInit = `(function(){try{var t=localStorage.getItem("cip-theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="blueprint">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${display.variable} ${mono.variable} ${body.variable} font-body`}>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Nav />
          <main className="relative flex-1 p-4 md:p-8">
            <span aria-hidden className="crosshair left-1 top-1">
              +
            </span>
            <span aria-hidden className="crosshair right-1 top-1">
              +
            </span>
            {children}
            <RulerFooter />
          </main>
        </div>
      </body>
    </html>
  );
}
