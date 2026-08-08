import { Nunito } from "next/font/google";

/**
 * Nunito Medium is the prototype's typeface — scoped to this route only. The
 * marketing site keeps its Helvetica/Inter identity; the terminal gets its
 * own voice. --font-terminal cascades to every component under this layout,
 * including the canvas-drawn labels in components/terminal/Visuals.tsx and
 * ChartAnalysis.tsx (those set the font name directly, since canvas text
 * can't resolve a CSS variable).
 */
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-terminal",
  display: "swap",
});

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return <div className={nunito.variable}>{children}</div>;
}
