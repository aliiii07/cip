/**
 * TEMPLATE COPY — every string and figure on the homepage lives here.
 *
 * This is a clone of parrotfinance.io, kept as a design template. The name,
 * wordmark, fund and broker marks, performance figures, Shark Tank badge and
 * regulatory copy (RIA, Form CRS/ADV) are Parrot Finance's, not CIP's, and
 * are placeholders to be replaced before this page ships on netcip.com.
 * Swap this one file (and ParrotLogo.tsx) and the whole page rebrands.
 */

export const BRAND = {
  name: "CIP",
  fullName: "Capital Investment Prospects",
  company: "Capital Investment Prospects, Inc.",
  email: "corporation@netcip.com",
  year: new Date().getFullYear(),
} as const;

export const NAV: { label: string; href: string }[] = [
  { label: "Partner with Us", href: "/partner" },
  { label: "Sign up / Log in", href: "/login" },
];

// The nav pill goes to the same place as the hero Launch button.
export const NAV_CTA = { label: "Launch CIP", href: "/prototype" } as const;

export const HERO = {
  // Rendered twice around the ring, so both halves read the same.
  badge: "FEATURED ON TECHSTARS • ",
  h1: "Easy Investing, Backed by Real Research",
  sub: "Deep research, live data, official info. What takes analysts a month, CIP gives you in seconds.",
  // The one entry point to the MVP (the prototype terminal).
  cta: { label: "Launch", href: "/prototype" },
} as const;

export const HOW = {
  h2: "How It Works",
  caption: "Everything shown here is an example, not investment advice.",
  steps: [
    {
      title: "Pick a Company You're Curious About",
      body: "Start with any of 50 top NASDAQ companies you already know, like Apple or Nvidia.",
    },
    {
      title: "Get the Story, Not the Jargon",
      body: "What the company does, how it's really doing, and what's happening right now.",
    },
    {
      title: "We Do the Deep Research",
      body: "Official reports, live data, and the numbers that matter, read and summed up for you in seconds.",
    },
    {
      title: "See If It Actually Holds Up",
      body: "We backtest the strategy against real history and check the risk, so you know before you invest.",
    },
  ],
} as const;

export const ACCESS = {
  h2: "50 Top NASDAQ Companies. Researched in Seconds.",
  sub: "Pick any of them and get the full picture, from official reports to backtests, without reading a single page yourself.",
  // One company per block, in block order. `logo` is the file the fetch
  // script (scripts/fetch-logos.mjs) writes into public/logos/; until it
  // exists the block shows the name as text in its own style.
  companies: [
    { name: "Apple", logo: "apple.png" },
    { name: "Nvidia", logo: "nvidia.png" },
    { name: "Microsoft", logo: "microsoft.png" },
    { name: "Amazon", logo: "amazon.png" },
    { name: "Tesla", logo: "tesla.png" },
    { name: "Alphabet", logo: "alphabet.png" },
  ],
  trademark:
    "Logos are trademarks of their respective owners and are used for identification only. CIP is not affiliated with or endorsed by these companies.",
} as const;

export const SECURITY = {
  // Rendered on two lines, same as before.
  h2a: "No Hype.",
  h2b: "Just Homework, Done Right.",
  sub: "We only use information you'd trust if you checked it yourself.",
  cards: [
    {
      icon: "doc",
      title: "Straight From the Source",
      body: "We read the official reports and company filings, so you don't have to.",
    },
    {
      icon: "pulse",
      title: "Always Up to Date",
      body: "Live market data, so you're never looking at last month's numbers.",
    },
    {
      icon: "research",
      title: "Deep Research in Seconds",
      body: "Our AI goes through hundreds of pages and tells you what actually matters.",
    },
  ],
} as const;

export const CALC = {
  h2: "This is what you've been missing",
  sub: "Enter an amount to see your potential investment growth in 1 year.",
  placeholder: "Enter Amount",
  savings: { label: "Savings Account", rate: 0.0039 },
  parrot: { label: "CIP", rate: 0.2765 },
  cards: [
    { name: "Inflation Defense", fund: "VanEck", period: "YTD", value: "+16.25%" },
    { name: "Sector Rotation", fund: "State Street", period: "YTD", value: "+06.50%" },
    { name: "Global Diversification", fund: "", period: "", value: "" },
    { name: "BlackRock Core Portfolio", fund: "BlackRock", period: "1 year", value: "+27.65%", hero: true },
    { name: "Income Strategy", fund: "Fidelity", period: "YTD", value: "+16.04%" },
  ],
  ghosts: [
    { name: "Digital Innovation", value: "$4,553.55", delta: "+23%" },
    { name: "Value Core", value: "$4,970.15", delta: "+11%" },
  ],
  disclaimer:
    "Disclaimer: This investment analysis tool presents hypothetical outcomes based on past performance. Modeled portfolio performance is based on the Blackrock Core Portfolio (1 year return of 27.65%). Actual returns will vary based on market conditions. Investing involves risk, including possible loss of principal. Images shown are for design only, and do not contain any implied advice or recommendation, however the purpose is to showcase some of CIP's offerings to users on the platform.",
  link: "See Full Assumptions & Disclosures",
} as const;

export const FAQ: { q: string; a: string }[] = [
  {
    q: "So what does CIP actually do?",
    a: "It does the research you'd normally spend weeks on. Pick a company and you'll see the full picture, what the big investors are doing, and whether the strategy holds up, in seconds.",
  },
  {
    q: "Where does your information come from?",
    a: "Official company reports, live market data, and deep reliable research.",
  },
  {
    q: "What do you mean by verified?",
    a: "Before we show you a strategy, we test it against real history and check the risk. If it doesn't hold up, it doesn't make the cut.",
  },
  {
    q: "Which companies can I look at?",
    a: "50 of the biggest companies on the NASDAQ for now, and we're adding more.",
  },
  {
    q: "I'm new to investing. Is this for me?",
    a: "Absolutely. We explain things the way a friend would, and the deep numbers are there if you want them.",
  },
];

export const FOOTER = {
  stay: "Stay up to date",
  copyright: `Copyright © ${new Date().getFullYear()} Capital Investment Prospects, Inc.`,
  links: ["Privacy", "Terms", "Disclaimer", "Form CRS", "Form ADV"],
  partner: "Apply to partner with us",
  contact: "Contact us at corporation@netcip.com",
} as const;
