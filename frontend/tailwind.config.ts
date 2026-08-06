import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--cip-bg)",
        surface: "var(--cip-surface)",
        raised: "var(--cip-surface-raised)",
        line: "var(--cip-border)",
        "line-strong": "var(--cip-border-strong)",
        ink: "var(--cip-ink)",
        secondary: "var(--cip-secondary)",
        muted: "var(--cip-muted)",
        accent: "var(--cip-accent)",
        "accent-bg": "var(--cip-accent-bg)",
        ok: "var(--cip-ok)",
        "ok-bg": "var(--cip-ok-bg)",
        warn: "var(--cip-warn)",
        "warn-bg": "var(--cip-warn-bg)",
        fail: "var(--cip-fail)",
        "fail-bg": "var(--cip-fail-bg)",
        rail: "var(--cip-rail)",
      },
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
