"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { EASE_PREMIUM } from "@/lib/motion";
import { COMPANY, NASDAQ_50, SECTOR_OF, type Quote, type Sector } from "@/lib/nasdaq50";
import {
  SHORT_SECTOR,
  TILE_GREEN,
  TILE_NEUTRAL,
  TILE_RED,
  changeTextColor,
  fmtCap,
  fmtChange,
  fmtPct,
  fmtPrice,
  fmtUpdated,
  layoutHeatmap,
  marketStateLabel,
  tileColor,
  tileText,
  type HeatmapLayout,
} from "@/lib/heatmap";
import type { Rect } from "@/lib/treemap";
import { useQuotes } from "./useQuotes";
import { FOCUS_RING_INSET } from "./styles";

const NOTE = "Company names are used for identification only. Not investment advice.";

const DESKTOP = { sectorGap: 10, tileGap: 3, labelH: 20, minTile: 24 };
const MOBILE = { sectorGap: 6, tileGap: 2, labelH: 15, minTile: 17 };

/**
 * Shape only, for the loading skeleton. List position stands in for size so
 * the placeholder is laid out like the real map; it carries no numbers and
 * no labels, and is replaced the moment quotes arrive.
 */
const PLACEHOLDER = NASDAQ_50.map((c, i) => ({
  symbol: c.symbol,
  sector: c.sector,
  value: 1 / Math.pow(i + 1, 0.85),
}));

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s && s.w === width && s.h === height ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

/** Rough width per character, used only until the real face has loaded. */
const FALLBACK_EM = 0.66;

/**
 * Text measurement in the page's own face. Tile and label sizing depend on
 * how wide a given ticker really is, which no estimate gets right for both
 * WDAY and INTC, so widths are measured on a canvas once fonts are ready and
 * again if a face arrives later.
 */
function useFontMeasure(rootRef: RefObject<HTMLElement>) {
  const [font, setFont] = useState<{ family: string; ctx: CanvasRenderingContext2D } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const setup = () => {
      const root = rootRef.current;
      if (!root || cancelled) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      setFont({ family: getComputedStyle(root).fontFamily, ctx });
    };
    void document.fonts.ready.then(setup);
    document.fonts.addEventListener("loadingdone", setup);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", setup);
    };
  }, [rootRef]);

  return useCallback(
    (text: string, weight: number, px: number) => {
      if (!font) return text.length * FALLBACK_EM * px;
      font.ctx.font = `${weight} ${px}px ${font.family}`;
      return font.ctx.measureText(text).width;
    },
    [font]
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

export function NasdaqHeatmap() {
  const { quotes, missing, asOf, error, refreshFailed } = useQuotes();
  const { ref, size } = useSize<HTMLDivElement>();
  const rootRef = useRef<HTMLDivElement>(null);
  const measure = useFontMeasure(rootRef);
  const coarse = useCoarsePointer();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const mobile = (size?.w ?? 1024) < 640;
  const labelPx = mobile ? 10 : 11;

  const tickerEm = useMemo(
    () => Object.fromEntries(NASDAQ_50.map((c) => [c.symbol, measure(c.symbol, 700, 100) / 100])),
    [measure]
  );

  // Full sector name if it fits the strip, its short form if that does, else nothing.
  const labelFor = useCallback(
    (sector: Sector, width: number): string | null => {
      const fits = (text: string) =>
        measure(text.toUpperCase(), 500, labelPx) + text.length * labelPx * 0.08 <= width - 4;
      if (fits(sector)) return sector;
      if (fits(SHORT_SECTOR[sector])) return SHORT_SECTOR[sector];
      return null;
    },
    [measure, labelPx]
  );

  // Companies are shown under the names in lib/nasdaq50.ts, not the feed's
  // registered names; the numbers stay exactly the feed's.
  const bySymbol = useMemo(
    () =>
      new Map(
        (quotes ?? []).map((q) => [q.symbol, { ...q, name: COMPANY[q.symbol]?.name ?? q.name }] as const)
      ),
    [quotes]
  );

  const layout = useMemo<HeatmapLayout | null>(() => {
    if (!size || size.w < 20 || size.h < 20) return null;
    const items = quotes
      ? quotes.map((q) => ({ symbol: q.symbol, sector: SECTOR_OF[q.symbol], value: q.marketCap }))
      : PLACEHOLDER;
    return layoutHeatmap(items, size.w, size.h, {
      ...(mobile ? MOBILE : DESKTOP),
      fits: (sector, width) => labelFor(sector, width) !== null,
    });
  }, [quotes, size, mobile, labelFor]);

  // Mice hover; touch has no hover, so there the selected tile carries the card.
  const cardSymbol = hovered ?? (coarse ? selected : null);
  const cardTile = cardSymbol && layout ? layout.tiles.find((t) => t.symbol === cardSymbol) : undefined;
  const cardQuote = cardSymbol ? bySymbol.get(cardSymbol) : undefined;

  let status: string;
  if (quotes && asOf) {
    const session = marketStateLabel(quotes[0].marketState);
    status = `Updated ${fmtUpdated(asOf)}`;
    if (session) status += ` · ${session}`;
    if (refreshFailed) status += " · Refresh failed, retrying";
    if (missing.length > 0) status += ` · No feed data for ${missing.join(", ")}`;
  } else if (error) {
    status = "Data unavailable, retrying";
  } else {
    status = "Loading live quotes";
  }

  return (
    <div
      ref={rootRef}
      className="pf-grid-light flex h-full flex-col bg-white pb-4 pl-4 pr-[46px] pt-[70px] text-[#1a1a1a] sm:pl-6 sm:pr-[64px] lg:pb-6 lg:pl-10 lg:pr-[80px] lg:pt-[78px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.5px] text-[#1a1a1a] lg:text-[26px]">
            NASDAQ 50
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-[#4a4a4a]">Pick a company to research.</p>
        </div>
        <p className="text-[12px] leading-snug text-[#71717A] tabular-nums" aria-live="polite">
          {status}
        </p>
      </div>

      <div ref={ref} className="relative mt-3 min-h-0 flex-1 lg:mt-4" aria-busy={!quotes && !error}>
        {layout && quotes
          ? layout.sectors.map((s) => {
              const text = s.label ? labelFor(s.sector, s.label.w) : null;
              return s.label && text ? (
                <div
                  key={s.sector}
                  className="absolute whitespace-nowrap px-0.5 font-medium uppercase tracking-[0.08em] text-[#71717A]"
                  title={s.sector}
                  style={{
                    left: s.label.x,
                    top: s.label.y,
                    width: s.label.w,
                    height: s.label.h,
                    lineHeight: `${s.label.h}px`,
                    fontSize: labelPx,
                  }}
                >
                  {text}
                </div>
              ) : null;
            })
          : null}

        {layout && quotes
          ? layout.tiles.map(({ symbol, rect }) => {
              const q = bySymbol.get(symbol);
              if (!q) return null;
              const text = tileText(rect.w, rect.h, tickerEm[symbol] ?? FALLBACK_EM * symbol.length, mobile);
              const isSelected = selected === symbol;
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setSelected(symbol)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setHovered(symbol);
                  }}
                  onPointerLeave={() => setHovered((h) => (h === symbol ? null : h))}
                  onFocus={() => setHovered(symbol)}
                  onBlur={() => setHovered((h) => (h === symbol ? null : h))}
                  aria-label={`${q.name}, ${fmtPrice(q.price)}, ${fmtPct(q.changePct)} today`}
                  aria-pressed={isSelected}
                  className={`group absolute flex flex-col items-center justify-center overflow-hidden rounded-[4px] text-white lg:rounded-[6px] ${
                    isSelected ? "z-[2] outline outline-2 -outline-offset-2 outline-[#B2F200]" : ""
                  } ${FOCUS_RING_INSET}`}
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    background: tileColor(q.changePct),
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-white opacity-0 transition-opacity duration-200 group-hover:opacity-[0.12]"
                    style={{ transitionTimingFunction: EASE_PREMIUM }}
                  />
                  <span
                    className="relative whitespace-nowrap font-bold leading-none tracking-[-0.01em]"
                    style={{
                      fontSize: text.ticker,
                      transform: text.rotate ? "rotate(-90deg)" : undefined,
                    }}
                  >
                    {symbol}
                  </span>
                  {text.change > 0 ? (
                    <span
                      className="relative font-medium leading-none text-white/90 tabular-nums"
                      style={{ fontSize: text.change, marginTop: Math.round(text.change * 0.4) }}
                    >
                      {fmtPct(q.changePct)}
                    </span>
                  ) : null}
                </button>
              );
            })
          : null}

        {layout && !quotes && !error
          ? layout.tiles.map(({ symbol, rect }) => (
              <div
                key={symbol}
                aria-hidden
                className="absolute animate-pulse rounded-[4px] bg-[#E4E4E7] lg:rounded-[6px]"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              />
            ))
          : null}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div role="status" className="max-w-[320px] rounded-[20px] border border-[#E4E4E7] bg-white px-6 py-5 text-center">
              <p className="text-[16px] font-semibold text-[#1a1a1a]">Data unavailable, retrying</p>
              <p className="mt-1 text-[13px] leading-snug text-[#4a4a4a]">
                Live quotes could not be loaded. Nothing is shown until they can be.
              </p>
            </div>
          </div>
        ) : null}

        {cardTile && cardQuote && size ? (
          <InfoCard tile={cardTile.rect} quote={cardQuote} bounds={size} />
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center gap-2 text-[11px] tabular-nums text-[#4a4a4a]">
          <span>{"−3%"}</span>
          <span
            aria-hidden
            className="h-2 w-[120px] rounded-full"
            style={{ background: `linear-gradient(90deg, ${TILE_RED}, ${TILE_NEUTRAL}, ${TILE_GREEN})` }}
          />
          <span>+3%</span>
        </div>
        <p className="text-[12px] leading-snug text-[#4a4a4a]">{NOTE}</p>
      </div>
    </div>
  );
}

/**
 * The hover card. Placed above the tile when there is room, otherwise below,
 * and always kept inside the map. It is measured after its first paint and
 * only then made visible, so it never flashes at the wrong spot.
 */
function InfoCard({ tile, quote, bounds }: { tile: Rect; quote: Quote; bounds: { w: number; h: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const x = Math.max(4, Math.min(bounds.w - cw - 4, tile.x + tile.w / 2 - cw / 2));
    let y = tile.y - ch - 8;
    if (y < 0) y = tile.y + tile.h + 8;
    if (y + ch > bounds.h) y = Math.max(4, Math.min(bounds.h - ch - 4, tile.y + 8));
    setPos({ x, y });
  }, [tile, bounds]);

  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none absolute z-10 w-[220px] rounded-[14px] border border-parrot-border bg-parrot-black/95 px-3.5 py-3"
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      <p className="truncate text-[14px] font-semibold leading-snug text-white">{quote.name}</p>
      <p className="mt-1 text-[13px] leading-snug tabular-nums text-white">
        {fmtPrice(quote.price)}
        <span className="ml-2 font-medium" style={{ color: changeTextColor(quote.changePct) }}>
          {fmtPct(quote.changePct)}
        </span>
        <span className="ml-1.5 text-parrot-muted">{fmtChange(quote.change)}</span>
      </p>
      <p className="mt-0.5 text-[12px] leading-snug tabular-nums text-parrot-muted">
        Market cap {fmtCap(quote.marketCap)}
      </p>
    </div>
  );
}
