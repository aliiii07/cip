import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { TopBar } from "@/components/TopBar";
import { Disclaimer } from "@/components/Disclaimer";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CIP — Capital Investment Prospects",
  description:
    "Capital Investment Prospects (CIP): search any stock, coin, or FX pair for an honest technical analysis, or turn a plain-English idea into a backtested, risk-gated strategy spec. Paper simulation only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${mono.variable} font-body`}>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="mx-auto w-full max-w-[1280px] flex-1 p-5">
              {children}
              <Disclaimer />
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
