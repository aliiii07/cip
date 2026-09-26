import { Activity, FileText } from "lucide-react";
import { SECURITY } from "@/lib/parrot-content";

/**
 * Magnifying glass over a small line chart, drawn on lucide's 24 grid with
 * the same round caps and stroke weight so it sits beside the lucide marks
 * as one set.
 */
function ChartSearch({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M6.5 12.5l2.5-3 2 2 3.5-4" />
      <path d="M21 21l-5.2-5.2" />
    </svg>
  );
}

const ICONS = { doc: FileText, pulse: Activity, research: ChartSearch } as const;

/** Teardrop outline with the lime line icon inside, as on the original. */
function Drop({ icon }: { icon: keyof typeof ICONS }) {
  const Icon = ICONS[icon];
  return (
    <span className="relative inline-flex h-[120px] w-[120px] items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0" aria-hidden>
        <path
          d="M60 4 H116 V60 A56 56 0 1 1 60 4 Z"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.2"
        />
      </svg>
      <Icon className="h-11 w-11 text-[#8CC400]" strokeWidth={1.7} />
    </span>
  );
}

/** White board with a hard grey extrusion on the right and bottom edges. */
function Board({ icon, title, body }: { icon: keyof typeof ICONS; title: string; body: string }) {
  return (
    <div className="group relative w-[341px] shrink-0 transition-transform duration-200 ease-out hover:-translate-y-1.5 lg:w-[calc((100%-128px)/3)] lg:max-w-[460px]">
      <span
        aria-hidden
        className="absolute left-[14px] top-[14px] block h-full w-full bg-[#D6D6D6]"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%, 0 calc(100% - 14px), calc(100% - 14px) calc(100% - 14px), calc(100% - 14px) 0)" }}
      />
      <span aria-hidden className="absolute left-[14px] top-[14px] block h-full w-full border border-[#1a1a1a]" />
      <div className="relative flex h-[404px] w-full flex-col items-center border border-[#1a1a1a] bg-white px-8 pt-16 text-center lg:h-[540px] lg:pt-[70px]">
        <Drop icon={icon} />
        <h3 className="mt-12 font-display text-[24px] font-semibold leading-[1.2] tracking-[-0.5px] text-[#1a1a1a] lg:text-[28px]">
          {title}
        </h3>
        <p className="mt-6 max-w-[380px] font-body text-[17px] leading-[28px] text-[#4a4a4a] lg:text-[22px] lg:leading-[36px]">
          {body}
        </p>
      </div>
    </div>
  );
}

export function Security() {
  return (
    <section id="security" className="bg-white py-24 lg:py-[120px]">
      <div className="mx-auto max-w-[1580px] px-6 text-center lg:px-[60px]">
        <h2 className="mx-auto max-w-[940px] font-display text-[36px] font-semibold leading-[1.08] tracking-[-1px] text-[#1a1a1a] lg:text-[64px] lg:leading-[76px]">
          {SECURITY.h2a}
          <br />
          {SECURITY.h2b}
        </h2>
        <p className="mx-auto mt-6 max-w-[900px] font-body text-[18px] leading-[28px] text-[#71717A] lg:text-[28px] lg:leading-[36.4px]">
          {SECURITY.sub}
        </p>

        <div className="mt-16 flex gap-8 overflow-x-auto pb-6 [scrollbar-width:none] lg:mt-24 lg:justify-center lg:gap-16 lg:overflow-visible lg:pb-0">
          {SECURITY.cards.map((c) => (
            <Board key={c.title} icon={c.icon} title={c.title} body={c.body} />
          ))}
        </div>
      </div>
    </section>
  );
}
