import { inset, squarify, type Placed, type Rect } from "./treemap";
import type { Sector } from "./nasdaq50";

/* ------------------------------------------------------------------ colour */

/**
 * The change scale. Neutral is a grey one step above the page background so
 * a flat day still reads as a tile; the ends are a deep crimson and a deep,
 * blue leaning green, chosen to sit on #1F1F1F without competing with the
 * lime accent, which stays reserved for selection and focus.
 */
export const TILE_NEUTRAL = "#303036";
export const TILE_RED = "#A12F35";
export const TILE_GREEN = "#0E7A57";
/** Lighter variants for the same meaning as text on the near black card. */
export const TEXT_RED = "#F0666E";
export const TEXT_GREEN = "#3FCB93";
/** The scale saturates at this many percent either way. */
export const SCALE_LIMIT = 3;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(ar, br)}, ${c(ag, bg)}, ${c(ab, bb)})`;
}

export function tileColor(changePct: number): string {
  const t = Math.pow(Math.min(1, Math.abs(changePct) / SCALE_LIMIT), 0.8);
  if (t === 0) return TILE_NEUTRAL;
  return mix(TILE_NEUTRAL, changePct < 0 ? TILE_RED : TILE_GREEN, t);
}

export function changeTextColor(changePct: number): string {
  if (changePct > 0) return TEXT_GREEN;
  if (changePct < 0) return TEXT_RED;
  return "#A1A1AA";
}

/* -------------------------------------------------------------- formatting */

const MINUS = "−";

export function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : p < 0 ? MINUS : "";
  return `${sign}${Math.abs(p).toFixed(2)}%`;
}

export function fmtPrice(p: number): string {
  return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtChange(c: number): string {
  const sign = c > 0 ? "+" : c < 0 ? MINUS : "";
  return `${sign}$${Math.abs(c).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
}

/** US market quotes carry their exchange's clock, so the time is shown in
 *  Eastern Time and says so, rather than silently in the viewer's zone. */
export function fmtUpdated(unixSeconds: number): string {
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
  return `${text} ET`;
}

export function marketStateLabel(state: string): string | null {
  switch (state) {
    case "REGULAR":
      return null;
    case "PRE":
    case "PREPRE":
      return "Pre market";
    case "POST":
    case "POSTPOST":
      return "After hours";
    default:
      return "Market closed";
  }
}

/* ------------------------------------------------------------------ layout */

export interface HeatmapItem {
  symbol: string;
  sector: Sector;
  value: number;
}

export interface LayoutOptions {
  /** Space between sector groups, in px. */
  sectorGap: number;
  /** Space between tiles inside a group, in px. */
  tileGap: number;
  /** Height of the sector label strip, in px. */
  labelH: number;
  /** Minimum thickness of a treemap row, in px, so no tile is a sliver. */
  minTile: number;
  /** Whether any label text fits a strip this wide. No strip is reserved
   *  for a group that could not carry one. Defaults to yes. */
  fits?: (sector: Sector, width: number) => boolean;
}

export interface HeatmapLayout {
  sectors: { sector: Sector; rect: Rect; label: Rect | null }[];
  tiles: { symbol: string; rect: Rect }[];
}

/**
 * Equal cells, largest first, in a grid shaped to the area. Used only for a
 * group so small that proportional cells could not carry a ticker; the
 * hover card still shows each company's real market cap.
 */
function gridLayout<T extends { value: number }>(items: T[], area: Rect): Placed<T>[] {
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  const n = sorted.length;
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * area.w) / area.h))));
  const rows = Math.ceil(n / cols);
  const cellH = area.h / rows;
  const out: Placed<T>[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r += 1) {
    const inRow = Math.min(cols, n - idx);
    const cellW = area.w / inRow;
    for (let c = 0; c < inRow; c += 1) {
      out.push({
        item: sorted[idx],
        rect: { x: area.x + c * cellW, y: area.y + r * cellH, w: cellW, h: cellH },
      });
      idx += 1;
    }
  }
  return out;
}

/**
 * Two level treemap: sectors are squarified across the whole area by their
 * combined value, then each sector's companies are squarified inside it,
 * beneath a label strip. Groups too small to carry a legible label drop the
 * strip rather than an unreadable one, and a group whose area could not
 * give every member a readable proportional cell falls back to equal cells.
 */
export function layoutHeatmap(
  items: HeatmapItem[],
  width: number,
  height: number,
  o: LayoutOptions
): HeatmapLayout {
  const groups = new Map<Sector, HeatmapItem[]>();
  for (const it of items) {
    const g = groups.get(it.sector);
    if (g) g.push(it);
    else groups.set(it.sector, [it]);
  }

  const sectors = Array.from(groups.entries()).map(([sector, members]) => ({
    sector,
    members,
    value: members.reduce((s, m) => s + m.value, 0),
  }));

  const placedSectors = squarify(sectors, { x: 0, y: 0, w: width, h: height }, o.minTile);
  const out: HeatmapLayout = { sectors: [], tiles: [] };

  for (const { item, rect } of placedSectors) {
    const inner = inset(rect, o.sectorGap / 2);
    const canLabel =
      inner.w >= 48 && inner.h >= o.labelH + 16 && (o.fits?.(item.sector, inner.w) ?? true);
    const label = canLabel ? { x: inner.x, y: inner.y, w: inner.w, h: o.labelH } : null;
    const area = label
      ? { x: inner.x, y: inner.y + o.labelH, w: inner.w, h: inner.h - o.labelH }
      : inner;

    out.sectors.push({ sector: item.sector, rect: inner, label });
    const cramped =
      item.members.length > 1 && area.w * area.h < item.members.length * (2 * o.minTile) ** 2;
    const tiles = cramped
      ? gridLayout(item.members, area)
      : squarify(item.members, area, o.minTile);
    for (const tile of tiles) {
      out.tiles.push({ symbol: tile.item.symbol, rect: inset(tile.rect, o.tileGap / 2) });
    }
  }

  return out;
}

/** Shorter names for groups too narrow to carry the full one. */
export const SHORT_SECTOR: Record<Sector, string> = {
  Technology: "Tech",
  "Communication Services": "Comms",
  "Consumer Cyclical": "Cyclical",
  "Consumer Defensive": "Staples",
  Healthcare: "Health",
  Industrials: "Industrial",
  Other: "Other",
};

/** Width of the change line, "+12.34%", in ems of its own font size. */
const CHANGE_EM = 4.2;

export interface TileText {
  /** Ticker font size in px. Never 0: every tile carries its ticker. */
  ticker: number;
  /** Change line font size in px, or 0 when the line is hidden. */
  change: number;
  /** True when the ticker runs along the tile's height, for tall narrow tiles. */
  rotate: boolean;
}

/**
 * Type sizes for a tile. The ticker is sized to the tile's height and to its
 * width using that ticker's measured width in ems, so a wide SKHY and a
 * narrow INTC each get the largest size that truly fits. It is never
 * dropped: below the floor it is drawn at the floor size, and on a tall
 * narrow tile it turns to run along the height rather than clip. The change
 * line appears only when there is room under the ticker, and never on
 * mobile, where the brief is tickers only.
 */
export function tileText(w: number, h: number, tickerEm: number, mobile: boolean): TileText {
  const cap = mobile ? 18 : 34;
  const floor = mobile ? 7 : 8;
  const inner = w - 4;
  if (!mobile) {
    // Two lines when both fit at a readable size: the ticker gives up a
    // little size so the change line can sit under it.
    const two = Math.floor(Math.min(h / 2.7, inner / tickerEm, inner / (CHANGE_EM * 0.72), cap));
    if (two >= 12) return { ticker: two, change: Math.round(two * 0.72), rotate: false };
  }
  const across = Math.min(h / 2.4, inner / tickerEm, cap);
  const along = Math.min(w / 2.4, (h - 4) / tickerEm, cap);
  if (across >= floor || across >= along) {
    return { ticker: Math.max(floor, Math.floor(across)), change: 0, rotate: false };
  }
  return { ticker: Math.max(floor, Math.floor(along)), change: 0, rotate: true };
}
