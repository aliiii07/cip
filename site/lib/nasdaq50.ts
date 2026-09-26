/**
 * The NASDAQ 50: the fifty companies the product covers today, the name each
 * is shown under, and the sector each is grouped under on the heatmap.
 *
 * Name and sector are fixed identification, not market data. Everything
 * numeric (price, day change, market cap) comes live from the quote feed and
 * is never stored here.
 */

export type Sector =
  | "Technology"
  | "Communication Services"
  | "Consumer Cyclical"
  | "Consumer Defensive"
  | "Healthcare"
  | "Industrials"
  | "Other";

export interface Company {
  symbol: string;
  name: string;
  sector: Sector;
}

export const NASDAQ_50: Company[] = [
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
  { symbol: "AAPL", name: "Apple", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
  { symbol: "AVGO", name: "Broadcom", sector: "Technology" },
  { symbol: "MU", name: "Micron Technology", sector: "Technology" },
  { symbol: "SKHY", name: "SK hynix", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "ASML", name: "ASML Holding", sector: "Technology" },
  { symbol: "INTC", name: "Intel", sector: "Technology" },
  { symbol: "CSCO", name: "Cisco Systems", sector: "Technology" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology" },
  { symbol: "LRCX", name: "Lam Research", sector: "Technology" },
  { symbol: "AMAT", name: "Applied Materials", sector: "Technology" },
  { symbol: "ARM", name: "Arm Holdings", sector: "Technology" },
  { symbol: "PANW", name: "Palo Alto Networks", sector: "Technology" },
  { symbol: "TXN", name: "Texas Instruments", sector: "Technology" },
  { symbol: "SNDK", name: "Sandisk", sector: "Technology" },
  { symbol: "KLAC", name: "KLA Corporation", sector: "Technology" },
  { symbol: "CRWD", name: "CrowdStrike", sector: "Technology" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Technology" },
  { symbol: "QCOM", name: "Qualcomm", sector: "Technology" },
  { symbol: "STX", name: "Seagate Technology", sector: "Technology" },
  { symbol: "ADI", name: "Analog Devices", sector: "Technology" },
  { symbol: "SHOP", name: "Shopify", sector: "Technology" },
  { symbol: "WDC", name: "Western Digital", sector: "Technology" },
  { symbol: "FTNT", name: "Fortinet", sector: "Technology" },
  { symbol: "APP", name: "AppLovin", sector: "Technology" },

  { symbol: "GOOGL", name: "Alphabet", sector: "Communication Services" },
  { symbol: "META", name: "Meta Platforms", sector: "Communication Services" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication Services" },
  { symbol: "TMUS", name: "T-Mobile US", sector: "Communication Services" },

  { symbol: "AMZN", name: "Amazon", sector: "Consumer Cyclical" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer Cyclical" },
  { symbol: "BKNG", name: "Booking Holdings", sector: "Consumer Cyclical" },
  { symbol: "SBUX", name: "Starbucks", sector: "Consumer Cyclical" },
  { symbol: "PDD", name: "PDD Holdings", sector: "Consumer Cyclical" },

  { symbol: "WMT", name: "Walmart", sector: "Consumer Defensive" },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer Defensive" },
  { symbol: "PEP", name: "PepsiCo", sector: "Consumer Defensive" },

  { symbol: "AMGN", name: "Amgen", sector: "Healthcare" },
  { symbol: "GILD", name: "Gilead Sciences", sector: "Healthcare" },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals", sector: "Healthcare" },
  { symbol: "ISRG", name: "Intuitive Surgical", sector: "Healthcare" },
  { symbol: "SNY", name: "Sanofi", sector: "Healthcare" },

  { symbol: "SPCX", name: "SpaceX", sector: "Industrials" },
  { symbol: "ADP", name: "Automatic Data Processing", sector: "Industrials" },

  // One company each from Financials, Materials, Real Estate and Utilities,
  // grouped under a single label so the map is not four one tile groups.
  { symbol: "HOOD", name: "Robinhood Markets", sector: "Other" },
  { symbol: "LIN", name: "Linde", sector: "Other" },
  { symbol: "EQIX", name: "Equinix", sector: "Other" },
  { symbol: "CEG", name: "Constellation Energy", sector: "Other" },
];

export const COMPANY: Record<string, Company> = Object.fromEntries(
  NASDAQ_50.map((c) => [c.symbol, c])
);

export const SECTOR_OF: Record<string, Sector> = Object.fromEntries(
  NASDAQ_50.map((c) => [c.symbol, c.sector])
);

/** One live quote, exactly as the feed reported it. */
export interface Quote {
  symbol: string;
  name: string;
  price: number;
  /** Day change in dollars. */
  change: number;
  /** Day change in percent. */
  changePct: number;
  marketCap: number;
  /** Unix seconds of the quote itself: the feed's own timestamp, not ours. */
  time: number;
  /** The exchange's session state, e.g. REGULAR, PRE, POST, CLOSED. */
  marketState: string;
}
