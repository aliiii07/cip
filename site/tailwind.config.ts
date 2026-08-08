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
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      maxWidth: {
        deck: "1360px",
      },
    },
  },
  plugins: [],
};

export default config;
