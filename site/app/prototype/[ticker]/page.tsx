import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/mvp/AppHeader";
import { ResearchPage } from "@/components/research/ResearchPage";
import { COMPANY, NASDAQ_50 } from "@/lib/nasdaq50";
import { loadResearch } from "@/lib/research";

/**
 * /prototype/aapl: one company's research. Built at deploy time from
 * data/companies/<TICKER>.json, so the page is instant; prices, the chart
 * and the backtest are live. A ticker outside the fifty is not found.
 */
export function generateStaticParams() {
  return NASDAQ_50.map((c) => ({ ticker: c.symbol.toLowerCase() }));
}

export function generateMetadata({ params }: { params: { ticker: string } }): Metadata {
  const company = COMPANY[params.ticker.toUpperCase()];
  return {
    title: company ? `${company.name} research · CIP` : "Company not covered · CIP",
    description: company ? `${company.name}: quick review and full analysis from official filings and live prices. Not investment advice.` : undefined,
  };
}

export default function CompanyPage({ params }: { params: { ticker: string } }) {
  const symbol = params.ticker.toUpperCase();
  const company = COMPANY[symbol];
  if (!company || params.ticker !== params.ticker.toLowerCase()) notFound();
  const research = loadResearch(symbol);
  return (
    <>
      <AppHeader back={{ href: "/prototype", label: "Back to companies" }} />
      <ResearchPage symbol={symbol} company={company} research={research} />
    </>
  );
}
