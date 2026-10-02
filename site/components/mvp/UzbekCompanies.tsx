"use client";

import { useEffect, useRef, useState } from "react";
import { EASE_PREMIUM } from "@/lib/motion";
import { useSnap } from "./SnapPages";
import styles from "./UzbekCompanies.module.css";

/**
 * Temporary switch while the variant is being chosen.
 * "A": white pattern lines with the lime traveling light.
 * "B": the same, with a very soft turquoise glow behind the pattern, after
 *      the blue tiles of Samarkand. Only this page uses that colour.
 */
const VARIANT: "A" | "B" = "A";

/** Position of this page in the stack, for pausing the art when it is off screen. */
const PAGE_INDEX = 2;

/* ---- girih geometry ------------------------------------------------------
 * A field of eight point stars, each inside an octagon, joined to its four
 * neighbours by lines that run through the octagon edges. Built once in
 * viewBox units and scaled to the surface, so the same drawing serves every
 * width.
 */
const VB_W = 1600;
const VB_H = 960;
const TILE = 160;
const STAR_R = 46;
const OCT_R = 76;

const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const f = (n: number) => n.toFixed(1);

interface Tile {
  d: string;
  len: number;
  delay: number;
}

function girih(): Tile[] {
  const tiles: Tile[] = [];
  const cols = VB_W / TILE;
  const rows = VB_H / TILE;
  const center: [number, number] = [VB_W / 2, VB_H / 2];
  const maxDist = dist(center, [TILE / 2, TILE / 2]);
  const edgeMid = OCT_R * Math.cos(Math.PI / 8);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * TILE + TILE / 2;
      const cy = r * TILE + TILE / 2;
      const parts: string[] = [];
      let len = 0;
      const poly = (pts: [number, number][]) => {
        parts.push(`M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}Z`);
        for (let i = 0; i < pts.length; i++) len += dist(pts[i], pts[(i + 1) % pts.length]);
      };
      // The star: two squares, one turned by 45 degrees.
      poly([0, 90, 180, 270].map((a) => pt(cx, cy, STAR_R, a)));
      poly([45, 135, 225, 315].map((a) => pt(cx, cy, STAR_R, a)));
      // The octagon around it, with edges facing the neighbours.
      poly(Array.from({ length: 8 }, (_, i) => pt(cx, cy, OCT_R, 22.5 + i * 45)));
      // Eight spokes from the star points to the octagon edges; the four
      // axial ones carry on to the tile edge and meet the next tile's.
      for (let i = 0; i < 8; i++) {
        const a = i * 45;
        const from = pt(cx, cy, STAR_R, a);
        const to = pt(cx, cy, i % 2 === 0 ? TILE / 2 : edgeMid, a);
        parts.push(`M${f(from[0])} ${f(from[1])}L${f(to[0])} ${f(to[1])}`);
        len += dist(from, to);
      }
      tiles.push({ d: parts.join(""), len: Math.ceil(len), delay: (dist(center, [cx, cy]) / maxDist) * 0.8 });
    }
  }
  return tiles;
}

const TILES = girih();

function Pattern({ stroke, opacity, width }: { stroke: string; opacity: number; width: number }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <g fill="none" stroke={stroke} strokeWidth={width} strokeOpacity={opacity} strokeLinejoin="round" strokeLinecap="round">
        {TILES.map((t, i) => (
          <path key={i} d={t.d} className={styles.line} style={{ "--len": t.len, "--d": `${t.delay.toFixed(2)}s` } as React.CSSProperties} />
        ))}
      </g>
    </svg>
  );
}

/** Per tile timing for the float and the shimmer, a pure function of the index. */
function timing(i: number): React.CSSProperties {
  const r = (k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    "--dur": `${(5.5 + r(1) * 3).toFixed(2)}s`,
    "--delay": `${(-r(2) * 8).toFixed(2)}s`,
    "--dy": `${(-6 - r(3) * 6).toFixed(1)}px`,
    "--sweep": `${(i * 0.9).toFixed(2)}s`,
  } as React.CSSProperties;
}

/**
 * Page 3: Uzbek companies, coming soon. The title block matches page 1
 * exactly; below it the girih pattern draws itself in once when the page is
 * first reached, a soft lime light then roams along its lines, and a cluster
 * of empty frosted tiles waits under the words. No names, no tickers, no
 * date.
 */
export function UzbekCompanies() {
  const { index } = useSnap();
  const active = index === PAGE_INDEX;
  const [drawn, setDrawn] = useState(false);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) setDrawn(true);
  }, [active]);

  // The light's path is written in fractions of the surface, so the surface
  // tells the stylesheet its size.
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const set = () => {
      el.style.setProperty("--cw", `${el.clientWidth}px`);
      el.style.setProperty("--ch", `${el.clientHeight}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lines = VARIANT === "B" ? "#D9F6F3" : "#FFFFFF";

  return (
    <div className="flex h-full flex-col bg-parrot-dark pb-4 pl-4 pr-[46px] pt-[70px] text-white sm:pl-6 sm:pr-[64px] lg:pb-6 lg:pl-10 lg:pr-[80px] lg:pt-[78px]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.5px] text-white lg:text-[26px]">
            Uzbek Companies
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-parrot-muted">
            Research on Uzbekistan&apos;s listed companies. Built the same way: official reports and real data.
          </p>
        </div>
      </div>

      <div
        ref={surface}
        className={`relative mt-3 min-h-0 flex-1 overflow-hidden lg:mt-4 ${drawn ? styles.drawing : ""} ${active ? "" : styles.paused}`}
        data-variant={VARIANT}
        data-active={active ? "true" : "false"}
      >
        {VARIANT === "B" ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
            style={{ background: "radial-gradient(closest-side, rgba(47, 184, 179, 0.16), rgba(47, 184, 179, 0.05) 55%, transparent 100%)" }}
            aria-hidden="true"
          />
        ) : null}

        <Pattern stroke={lines} opacity={0.17} width={1.3} />

        {/* The lime light: a soft window that roams while the lime copy of the pattern inside it moves the opposite way, so the light travels and the lines stay put. */}
        <div className={styles.lightWindow} aria-hidden="true">
          <div className={styles.lightPattern}>
            <Pattern stroke="#B2F200" opacity={0.85} width={1.5} />
          </div>
        </div>

        <div className="relative flex h-full items-center justify-center">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-y-20 lg:gap-x-6 lg:gap-y-24" aria-label="Places for the first Uzbek companies">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className={`${i >= 4 ? "hidden md:block" : ""} ${styles.float}`} style={timing(i)}>
                <div
                  className={`${styles.shimmer} group relative h-[58px] w-[62px] overflow-hidden rounded-[14px] border border-white/15 bg-white/[0.08] backdrop-blur-md transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-parrot-lime/60 hover:shadow-[0_0_28px_rgba(178,242,0,0.22)] sm:h-[88px] sm:w-[96px] lg:h-[112px] lg:w-[120px] lg:rounded-[18px]`}
                  style={{ transitionTimingFunction: EASE_PREMIUM }}
                >
                  <span className="absolute left-[22%] top-[18%] h-[38%] w-[46%] rounded-full bg-white/25 blur-[7px]" />
                  <span className="absolute bottom-[16%] left-[18%] h-[14%] w-[62%] rounded-full bg-white/20 blur-[4px]" />
                  <span className="absolute bottom-[34%] right-[14%] h-[22%] w-[22%] rounded-full bg-parrot-lime/20 blur-[6px]" />
                </div>
              </li>
            ))}
          </ul>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <div className="relative inline-block">
              <h2 className="font-display text-[44px] font-bold leading-none tracking-[-1.5px] text-white [text-shadow:0_2px_28px_rgba(31,31,31,0.9)] sm:text-[64px] sm:tracking-[-2px] lg:text-[88px] lg:tracking-[-3px]">
                Coming Soon
              </h2>
              <div className={styles.textWindow} aria-hidden="true">
                <div className={styles.textInner}>
                  <span className="block font-display text-[44px] font-bold leading-none tracking-[-1.5px] text-parrot-lime sm:text-[64px] sm:tracking-[-2px] lg:text-[88px] lg:tracking-[-3px]">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 font-display text-[18px] font-medium leading-none text-parrot-lime [text-shadow:0_1px_18px_rgba(31,31,31,0.9)] sm:text-[22px] lg:mt-3 lg:text-[26px]">
              Tez orada
            </p>
            <p className="mt-4 max-w-[420px] text-[13px] leading-snug text-white/85 [text-shadow:0_1px_16px_rgba(31,31,31,0.95)] sm:text-[15px] lg:mt-5 lg:max-w-[520px] lg:text-[16px]">
              We are preparing research on Uzbek companies with the same honesty and verification as everything else on C.I.P.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
