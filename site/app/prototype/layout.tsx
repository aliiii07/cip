/**
 * The prototype is set in Georgia, end to end.
 *
 * Both variables the terminal consumes are pointed at it: --font-terminal for
 * prose and --font-mono for the figures. Georgia is a system serif, so there
 * is no webfont request and nothing to wait for before a number is legible.
 *
 * Scoped to this route only. The marketing pages keep their own faces, since
 * they read from the root layout and never see these declarations.
 */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  const georgia = 'Georgia, "Times New Roman", Times, serif';
  return (
    <div
      style={
        {
          "--font-terminal": georgia,
          "--font-mono": georgia,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
