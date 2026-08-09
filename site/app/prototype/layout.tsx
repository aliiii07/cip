/**
 * The prototype uses the same typeface as the rest of the site: Helvetica
 * Neue, falling back to the Inter instance already loaded once in the root
 * layout. It used to load Nunito here as a deliberately separate "terminal"
 * voice, but that made the prototype read as a different app pasted into
 * CIP rather than a page of it — so --font-terminal now just aliases the
 * root's font stack instead of loading a second family. The variable name
 * stays, since components/terminal/Visuals.tsx and ChartAnalysis.tsx still
 * key off it for canvas text, which can't resolve a CSS var directly.
 */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ "--font-terminal": "var(--font-sans-fallback)" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
