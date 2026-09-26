"use client";

import type { ReactNode } from "react";

/**
 * Three 341×404 boards with a hard isometric extrusion.
 *
 * The slab is drawn with solid offset polygons rather than a blurred shadow.
 * A soft shadow reads as a floating card; a solid edge reads as an object
 * with thickness, which is the whole point of the treatment.
 */

const ICON = {
  shield: (
    <>
      <path d="M24 6 l16 6 v12c0 10-6.6 16.8-16 20 -9.4-3.2-16-10-16-20V12z" />
      <path d="M17 24 l5 5 l10 -11" />
    </>
  ),
  key: (
    <>
      <circle cx="17" cy="17" r="9" />
      <path d="M23.5 23.5 L40 40" />
      <path d="M34 34 l5 -5" />
      <path d="M29 29 l5 -5" />
    </>
  ),
  doc: (
    <>
      <path d="M12 6 h16 l8 8 v28 H12z" />
      <path d="M28 6 v8 h8" />
      <path d="M18 26 h12" />
      <path d="M18 33 h8" />
    </>
  ),
};

const BOARDS: { icon: keyof typeof ICON; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "AI-Verified Safety",
    body: "Nothing is offered without historical data, research, and risk models.",
  },
  {
    icon: "simulated" as never,
    title: "Simulated Testing First",
    body: "Paper money; zero real-money risk required to learn.",
  },
  {
    icon: "doc",
    title: "Clear & Honest Metrics",
    body: "Expectancy first. Plain language. No hidden cut of assets. Simulated results labeled.",
  },
];
// the middle board uses the key mark
BOARDS[1].icon = "key";

function Board({
  icon,
  title,
  body,
}: {
  icon: keyof typeof ICON;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="group relative h-[404px] w-[341px] shrink-0 transition-transform duration-200 ease-out hover:-translate-y-1.5">
      {/* extrusion: two solid slabs, no blur */}
      <span
        aria-hidden
        className="absolute left-[14px] top-[14px] block h-[404px] w-[341px] bg-[#0B0B0D]"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
      <div className="relative flex h-full w-full flex-col bg-white p-9">
        <svg
          viewBox="0 0 48 48"
          className="h-12 w-12"
          fill="none"
          stroke="#8A8886"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {ICON[icon]}
        </svg>
        <h3 className="mt-auto font-display text-[28px] font-semibold leading-[1.15] tracking-[-1px] text-pure-black">
          {title}
        </h3>
        <p className="mt-4 font-body text-[17px] font-normal leading-[26px] text-text-light-muted">
          {body}
        </p>
      </div>
    </div>
  );
}

export function SecuritySection() {
  return (
    <section className="money-area bg-true-black py-24 lg:py-[120px]">
      <div className="mx-auto max-w-content px-6 lg:px-0">
        <h2 className="max-w-[900px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-1px] text-white lg:text-[58px] lg:leading-[63.8px]">
          Verification at the Center of Everything
        </h2>
        <p className="mt-6 max-w-[780px] font-body text-[18px] font-normal leading-[28px] tracking-[-0.5px] text-text-light-muted lg:text-[28px] lg:leading-[36.4px]">
          Every strategy passes data checks, backtesting, and AI risk reviews
          before reaching you. Paper-first. No live brokerage.
        </p>

        <div className="mt-16 flex gap-8 overflow-x-auto pb-6 [scrollbar-width:none] lg:mt-20 lg:overflow-visible lg:pb-0">
          {BOARDS.map((b) => (
            <Board key={b.title} icon={b.icon} title={b.title} body={b.body} />
          ))}
        </div>
      </div>
    </section>
  );
}
