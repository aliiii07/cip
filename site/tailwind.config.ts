import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface A — marketing (the deck world)
        ink: "var(--ink)",
        "ink-panel": "var(--ink-panel)",
        paper: "var(--paper)",
        "on-light": "var(--text-on-light)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        hairline: "var(--hairline)",
        "hairline-light": "var(--hairline-light)",
        signal: "var(--signal)",
        // Surface B — MIROFISH terminal
        "paper-bg": "var(--paper-bg)",
        frame: "var(--frame)",
        "t-ink": "var(--t-ink)",
        "t-muted": "var(--t-muted)",
        "t-faint": "var(--t-faint)",
        hair: "var(--hair)",
        green: "var(--green)",
        "green-d": "var(--green-d)",
        brick: "var(--red)",
        "brick-d": "var(--red-d)",
        grey: "var(--grey)",
        amber: "var(--amber)",

        /* --- Surface C — the landing page ---------------------------------
           Titanium replaces Parrot's lime everywhere it appears: the badge,
           the arc nodes, the rail, the icons and the highlight chip. There is
           no green anywhere in this scale, deliberately. */
        "pure-black": "#0A0A0A",
        "true-black": "#000000",
        "dark-bg": "#121212",
        "dark-bg-2": "#1F1F1F",
        "dark-bg-3": "#18181B",
        "dark-card": "#1C1C1E",
        "dark-card-2": "#27272A",
        "dark-border": "#3F3F46",
        "light-bg": "#F5F5F7",
        "light-bg-2": "#E5E5E7",
        "light-border": "#E4E4E7",
        titanium: "#9F9D9B",
        "titanium-deep": "#8A8886",
        "titanium-light": "#C2C0BC",
        "text-dark-muted": "#A1A1AA",
        "text-light-muted": "#71717A",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        /* Landing only. The marketing deck and the terminal keep their own
           faces; nothing here is applied globally. */
        display: ["var(--font-figtree)", "sans-serif"],
        body: ["var(--font-figtree)", "var(--font-inter)", "sans-serif"],
      },
      maxWidth: {
        deck: "1360px",
        content: "1080px",
        artboard: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
