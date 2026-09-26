import { existsSync } from "node:fs";
import path from "node:path";
import { ACCESS } from "@/lib/parrot-content";

/**
 * Isometric white boxes on a drawn floor, one company mark lying flat on each
 * top face. The top face is a 2:1 diamond, so whatever sits on it (logo file
 * or, until the files are fetched, the name as text) is set through the same
 * skew matrix and reads as printed on the box rather than pasted over it.
 *
 * Logos come from scripts/fetch-logos.mjs and are used exactly as provided:
 * no recolor, no crop, no effects. This is a server component so it can
 * check on disk which files exist.
 */
const LABEL_STYLES: React.CSSProperties[] = [
  { color: "#0057B8", fontWeight: 800, fontStyle: "italic", fontSize: 22 },
  { color: "#4C9A2A", fontWeight: 700, fontStyle: "italic", fontSize: 22 },
  { color: "#96151D", fontWeight: 700, fontSize: 25 },
  { color: "#111111", fontWeight: 800, letterSpacing: "-0.02em", fontSize: 22 },
  { color: "#111111", fontFamily: "Georgia, serif", fontSize: 24 },
  { color: "#1F3A6E", fontWeight: 800, fontSize: 24 },
];

/**
 * Horizontal placement as a fraction of the free width (container minus one
 * cube), so the same staggered arrangement holds at 1580px and at 1440px
 * without the last cube being clipped at the edge.
 */
const POSITIONS: [number, number][] = [
  [0.03, 20],
  [0.417, 20],
  [0.811, 20],
  [0.208, 190],
  [0.603, 190],
  [0.99, 190],
];

function logoExists(file: string): boolean {
  return existsSync(path.join(process.cwd(), "public", "logos", file));
}

function Cube({
  name,
  logo,
  style,
}: {
  name: string;
  logo: string | null;
  style: React.CSSProperties;
}) {
  return (
    <div className="relative h-[210px] w-[236px] transition-transform duration-200 ease-out hover:-translate-y-2">
      <svg viewBox="0 0 236 210" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* floor shadow */}
        <polygon points="150,118 258,64 258,128 150,182" fill="#000" opacity="0.08" transform="translate(-30 26)" />
        {/* faces */}
        <polygon points="118,4 232,61 118,118 4,61" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth="1.2" />
        <polygon points="4,61 118,118 118,178 4,121" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth="1.2" />
        <polygon points="118,118 232,61 232,121 118,178" fill="#F4F4F4" stroke="#1a1a1a" strokeWidth="1.2" />
      </svg>
      <div
        className="absolute left-[118px] top-[61px] flex w-[150px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ transform: "translate(-50%, -50%) matrix(0.87, 0.435, -0.87, 0.435, 0, 0)" }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- used as provided, no optimization pass
          <img src={logo} alt={`${name} logo`} className="h-[72px] w-auto max-w-[126px] object-contain" />
        ) : (
          <span style={{ fontFamily: "var(--font-figtree), sans-serif", ...style }}>{name}</span>
        )}
      </div>
    </div>
  );
}

export function AccessCubes() {
  const blocks = ACCESS.companies.map((c, i) => ({
    name: c.name,
    logo: logoExists(c.logo) ? `/logos/${c.logo}` : null,
    style: LABEL_STYLES[i],
    pos: POSITIONS[i],
  }));
  const anyLogo = blocks.some((b) => b.logo);

  return (
    <section id="access" className="relative overflow-hidden bg-white py-24 lg:py-[120px]">
      <div className="mx-auto max-w-content px-6 text-center lg:px-0">
        <h2 className="mx-auto max-w-[940px] font-display text-[36px] font-semibold leading-[1.08] tracking-[-1px] text-[#1a1a1a] lg:text-[58px] lg:leading-[63.8px]">
          {ACCESS.h2}
        </h2>
        <p className="mx-auto mt-6 max-w-[940px] font-body text-[18px] font-normal leading-[28px] text-[#71717A] lg:text-[28px] lg:leading-[36.4px]">
          {ACCESS.sub}
        </p>
      </div>

      <div className="relative mt-14 lg:mt-20">
        {/* drawn isometric floor */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[520px] w-[1700px] max-w-none opacity-60"
          viewBox="0 0 1700 520"
        >
          <defs>
            <pattern id="pfIso" width="96" height="48" patternUnits="userSpaceOnUse">
              <path d="M0 24 L48 0 M48 0 L96 24 M0 24 L48 48 M48 48 L96 24" fill="none" stroke="#E4E4E7" strokeWidth="1" />
            </pattern>
            <radialGradient id="pfFade" cx="50%" cy="50%" r="55%">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect width="1700" height="520" fill="url(#pfIso)" />
          <rect width="1700" height="520" fill="url(#pfFade)" />
        </svg>

        {/* desktop: two staggered rows */}
        <div className="relative mx-auto hidden h-[440px] max-w-[1580px] lg:block">
          {blocks.map((b) => (
            <div
              key={b.name}
              className="absolute"
              style={{ left: `calc((100% - 236px) * ${b.pos[0]})`, top: b.pos[1] }}
            >
              <Cube name={b.name} logo={b.logo} style={b.style} />
            </div>
          ))}
        </div>

        {/* mobile: horizontal slide */}
        <div className="relative overflow-x-auto px-6 pb-8 [scrollbar-width:none] lg:hidden">
          <ul className="flex w-max gap-4">
            {blocks.map((b) => (
              <li key={b.name} className="shrink-0">
                <Cube name={b.name} logo={b.logo} style={b.style} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {anyLogo ? (
        <p className="mx-auto mt-10 max-w-[940px] px-6 text-center font-body text-[13px] leading-relaxed text-[#8a8a8a] lg:px-0">
          {ACCESS.trademark}
        </p>
      ) : null}
    </section>
  );
}
