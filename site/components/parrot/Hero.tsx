import Link from "next/link";
import { HERO } from "@/lib/parrot-content";

/** Circular rotating "Featured on Techstars" badge with a megaphone. */
function SharkTankBadge() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-[80px] hidden h-[205px] w-[205px] lg:block"
    >
      <svg viewBox="0 0 205 205" className="pf-spin h-full w-full">
        <defs>
          <path
            id="pfBadgeArc"
            d="M102.5 102.5 m -78 0 a 78 78 0 1 1 156 0 a 78 78 0 1 1 -156 0"
            fill="none"
          />
        </defs>
        <text
          fill="#B2F200"
          fontSize="13"
          letterSpacing="2.2"
          fontFamily="var(--font-figtree), sans-serif"
          fontWeight={700}
        >
          <textPath href="#pfBadgeArc" startOffset="0">
            {HERO.badge + HERO.badge}
          </textPath>
        </text>
      </svg>
      {/* megaphone, static in the centre */}
      <svg
        viewBox="0 0 64 64"
        className="absolute left-1/2 top-1/2 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2"
        fill="none"
        stroke="#E5E5E5"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M14 26h8l18-10v32L22 38h-8z" fill="#F2F2F2" />
        <path d="M14 26v12" />
        <path d="M22 38l4 12h6l-3-12" fill="#E5E5E5" />
        <path d="M44 24c3 2 3 14 0 16" />
        <path d="M49 19c5 4 5 22 0 26" />
        <path d="M50 12l4-4M54 30h6M50 48l4 4" stroke="#B2F200" />
      </svg>
    </div>
  );
}

/**
 * Hairline arc with four lime nodes. A wide, tall half ellipse (rx 760,
 * ry 620) so the headline, subline and button sit inside it with room to
 * spare; the money pile rests on its apex. The nodes sit at ±48° (beside
 * the headline) and ±66° (beside the subline), clear of every line of text.
 * Scaled down below lg, where it may run past the screen edges.
 */
function Arc() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1520 620"
      className="pointer-events-none absolute left-1/2 top-[210px] w-[900px] -translate-x-1/2 md:top-[240px] md:w-[1300px] lg:top-[370px] lg:w-[1520px]"
    >
      <path d="M0 620 A760 620 0 0 1 1520 620" fill="none" stroke="#F2F2F2" strokeWidth="1" />
      {[
        [195, 205],
        [1325, 205],
        [66, 368],
        [1454, 368],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="11" fill="#C6F04A" />
      ))}
    </svg>
  );
}

/**
 * Isometric money, drawn here as original SVG: a 3 by 2 block of thick bill
 * stacks at different heights, two tall coin stacks either side, and three
 * loose coins in front. Lit from the top left: top faces lightest, left
 * faces medium, right faces darkest, outlines in a darker shade of each
 * object's own color. Soft untinted shadow under the pile, faint warm glow
 * behind it, and a gentle float.
 */
const BILL_T = 6.5; // thickness of one bill
const COIN_T = 5.5; // thickness of one coin

function BillStack({ x, y, n }: { x: number; y: number; n: number }) {
  const h = n * BILL_T;
  const lines = Array.from({ length: n - 1 }, (_, i) => (i + 1) * BILL_T);
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* left face */}
      <path d={`M0 31 L62 62 L62 ${62 - h} L0 ${31 - h} Z`} fill="#7FA673" stroke="#3F5E39" strokeWidth="1" />
      {/* right face */}
      <path d={`M62 62 L124 31 L124 ${31 - h} L62 ${62 - h} Z`} fill="#5C8453" stroke="#3F5E39" strokeWidth="1" />
      {/* individual bills along both faces */}
      {lines.map((d) => (
        <g key={d} opacity="0.55">
          <path d={`M0 ${31 - d} L62 ${62 - d}`} stroke="#5C8453" strokeWidth="0.8" />
          <path d={`M62 ${62 - d} L124 ${31 - d}`} stroke="#3F5E39" strokeWidth="0.8" />
        </g>
      ))}
      {/* top face */}
      <g transform={`translate(0 ${-h})`}>
        <path d="M0 31 L62 0 L124 31 L62 62 Z" fill="url(#pfBillTop)" stroke="#3F5E39" strokeWidth="1" />
        <path d="M12 31 L62 6 L112 31 L62 56 Z" fill="none" stroke="#3F5E39" strokeWidth="0.8" />
        <ellipse cx="62" cy="31" rx="15" ry="7.5" fill="none" stroke="#3F5E39" strokeWidth="1" />
        <path d="M20 34 l7 -3.5 M97 28 l7 -3.5" stroke="#3F5E39" strokeWidth="0.8" />
      </g>
    </g>
  );
}

function CoinStack({ cx, bottom, n }: { cx: number; bottom: number; n: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const y = bottom - i * COIN_T;
        return (
          <g key={i}>
            <path
              d={`M${cx - 24} ${y} v${COIN_T} a24 12 0 0 0 48 0 v-${COIN_T}`}
              fill="url(#pfCoinSide)"
              stroke="#7A5A18"
              strokeWidth="0.9"
            />
            <ellipse cx={cx} cy={y} rx="24" ry="12" fill="url(#pfCoinTop)" stroke="#7A5A18" strokeWidth="0.9" />
            <path
              d={`M${cx - 15} ${y - 3} A16 8 0 0 1 ${cx - 5} ${y - 9}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        );
      })}
      <text
        x={cx}
        y={bottom - (n - 1) * COIN_T + 4.5}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#8A6410"
        fontFamily="var(--font-figtree), sans-serif"
      >
        $
      </text>
    </g>
  );
}

function Money() {
  // 3 columns along the down-right axis, 2 rows along the up-right axis.
  // Back row first so the front row paints over it.
  const stacks: [number, number, number][] = [
    [167, 119, 6],
    [229, 150, 5],
    [291, 181, 7],
    [105, 150, 4],
    [167, 181, 7],
    [229, 212, 5],
  ];
  return (
    <svg
      viewBox="0 0 520 340"
      className="pf-money-float h-[200px] w-[306px] lg:h-[320px] lg:w-[490px]"
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="pfBillTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9D6AB" />
          <stop offset="0.6" stopColor="#A8C99A" />
          <stop offset="1" stopColor="#9EBF90" />
        </linearGradient>
        <linearGradient id="pfCoinTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7D774" />
          <stop offset="1" stopColor="#E0B03C" />
        </linearGradient>
        <linearGradient id="pfCoinSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C99A2E" />
          <stop offset="1" stopColor="#9C7420" />
        </linearGradient>
        <radialGradient id="pfMoneyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#F7D774" stopOpacity="0.13" />
          <stop offset="0.6" stopColor="#F7D774" stopOpacity="0.04" />
          <stop offset="1" stopColor="#F7D774" stopOpacity="0" />
        </radialGradient>
        <filter id="pfMoneyShadow" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* faint warm glow behind the pile */}
      <ellipse cx="260" cy="190" rx="300" ry="185" fill="url(#pfMoneyGlow)" />
      {/* soft untinted shadow under the pile */}
      <ellipse cx="260" cy="300" rx="225" ry="34" fill="#000000" opacity="0.4" filter="url(#pfMoneyShadow)" />

      <CoinStack cx={60} bottom={250} n={9} />
      {stacks.map(([x, y, n]) => (
        <BillStack key={`${x}-${y}`} x={x} y={y} n={n} />
      ))}
      <CoinStack cx={462} bottom={246} n={10} />

      {/* loose coins in front */}
      <CoinStack cx={190} bottom={300} n={1} />
      <CoinStack cx={252} bottom={316} n={1} />
      <CoinStack cx={332} bottom={304} n={1} />
    </svg>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-br-[160px] bg-parrot-dark pt-[94px] lg:rounded-br-[220px]"
    >
      <div className="relative mx-auto max-w-[1580px] px-6 lg:px-[60px]">
        <SharkTankBadge />
        <Arc />

        <div className="relative mx-auto flex max-w-content flex-col items-center pb-[120px] pt-[60px] text-center lg:pt-[130px]">
          <Money />

          <h1 className="mt-8 max-w-[928px] font-display text-[40px] font-semibold leading-[1.1] tracking-[-1px] text-white md:mt-[60px] md:max-w-[600px] lg:max-w-[928px] lg:text-[62px] lg:leading-[74.4px]">
            {HERO.h1}
          </h1>

          <p className="mt-7 max-w-[692px] font-body text-[18px] leading-[28px] text-parrot-muted lg:text-[24px] lg:leading-[36px]">
            {HERO.sub}
          </p>

          <Link
            href={HERO.cta.href}
            className="mt-10 inline-block rounded-[80px] bg-white px-14 py-5 font-display text-[24px] font-medium leading-none text-parrot-black transition-transform duration-200 hover:scale-[1.03]"
          >
            {HERO.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
