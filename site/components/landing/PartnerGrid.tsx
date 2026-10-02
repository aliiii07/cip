"use client";

import Image from "next/image";

/**
 * Eight pre-rendered isometric tiles standing on a drawn perspective floor.
 *
 * The tiles are flat SVG art with their three faces already projected, not
 * DOM boxes under a rotateX transform: real 3D in the DOM costs a composite
 * layer per tile, softens every edge on hover, and breaks the moment a parent
 * gets its own transform. Projected art keeps the silhouette exact.
 *
 * No fund marks appear here. These are CIP's own model books.
 */

const TILES = [
  { src: "/landing/cube-1.svg", name: "Global Equity Book" },
  { src: "/landing/cube-2.svg", name: "Income Book" },
  { src: "/landing/cube-3.svg", name: "Risk-Reviewed Core" },
  { src: "/landing/cube-4.svg", name: "Emerging Book" },
  { src: "/landing/cube-5.svg", name: "Paper Momentum" },
  { src: "/landing/cube-6.svg", name: "Verified Mix" },
  { src: "/landing/cube-7.svg", name: "Global Equity Book" },
  { src: "/landing/cube-8.svg", name: "Risk-Reviewed Core" },
];

export function PartnerGrid() {
  return (
    <section id="verified" className="access-area relative overflow-hidden bg-true-black py-24 lg:py-[120px]">
      <div className="mx-auto max-w-content px-6 lg:px-0">
        <h2 className="max-w-[900px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-1px] text-white lg:text-[58px] lg:leading-[63.8px]">
          Want access to top institutional-style playbooks?
        </h2>
        <p className="mt-6 max-w-[760px] font-body text-[18px] font-normal leading-[28px] tracking-[-0.5px] text-text-light-muted lg:text-[28px] lg:leading-[36.4px]">
          Follow model books verified by C.I.P’s data and backtesting engine
          across global and emerging markets. Simulated until you choose
          otherwise.
        </p>
      </div>

      <div className="relative mt-16 lg:mt-20">
        {/* drawn floor the tiles stand on */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
          <Image
            src="/landing/cube-floor.svg"
            alt=""
            width={1080}
            height={320}
            className="h-[320px] w-[1080px] max-w-none opacity-80"
          />
        </div>

        {/* On narrow screens this slides horizontally rather than reflowing
            into a cramped grid, which would shrink each tile past legibility. */}
        <div className="relative mx-auto max-w-content overflow-x-auto px-6 pb-10 [scrollbar-width:none] lg:overflow-visible lg:px-0">
          <ul className="flex w-max gap-6 lg:grid lg:w-full lg:grid-cols-4 lg:gap-x-8 lg:gap-y-10">
            {TILES.map((t, i) => (
              <li
                key={i}
                className="group shrink-0 transition-transform duration-200 ease-out hover:-translate-y-2"
              >
                <Image
                  src={t.src}
                  alt={t.name}
                  width={216}
                  height={152}
                  className="h-[152px] w-[216px]"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
