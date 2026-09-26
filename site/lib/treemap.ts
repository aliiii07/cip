/**
 * Squarified treemap (Bruls, Huizing and van Wijk, 2000).
 *
 * Items are placed largest first. A row is closed the moment adding the next
 * item would make the row's worst tile less square than it already is, which
 * keeps every tile as close to a square as the data allows. Rows run along
 * the shorter side of whatever space is left, so the result stays balanced
 * whether the area is wide or tall.
 *
 * One addition to the paper: a minimum row thickness. A giant beside a tiny
 * item would otherwise leave the tiny one a sliver a few pixels thick, since
 * the last row simply takes what is left. With a floor, a big row is capped
 * so that at least one floor thick strip remains for the rest, and no row is
 * laid thinner than the floor. The largest tiles give up a few pixels; every
 * other tile keeps its proportional area.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placed<T> {
  item: T;
  rect: Rect;
}

export function squarify<T extends { value: number }>(
  items: T[],
  area: Rect,
  minThickness = 0
): Placed<T>[] {
  const sorted = items.filter((it) => it.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, it) => sum + it.value, 0);
  const out: Placed<T>[] = [];
  if (sorted.length === 0 || total <= 0 || area.w <= 0 || area.h <= 0) return out;

  const scale = (area.w * area.h) / total;
  const areas = sorted.map((it) => it.value * scale);
  let { x, y, w, h } = area;
  let i = 0;

  while (i < sorted.length && w > 0 && h > 0) {
    const across = w < h; // the row runs across the width and stacks downward
    const side = across ? w : h;
    const length = across ? h : w;
    let j = i;
    let sum = 0;
    let min = Infinity;
    let max = 0;
    let worst = Infinity;

    while (j < sorted.length) {
      const a = areas[j];
      const nextSum = sum + a;
      const nextMin = Math.min(min, a);
      const nextMax = Math.max(max, a);
      const ratio = Math.max(
        (side * side * nextMax) / (nextSum * nextSum),
        (nextSum * nextSum) / (side * side * nextMin)
      );
      if (ratio > worst) break;
      worst = ratio;
      sum = nextSum;
      min = nextMin;
      max = nextMax;
      j += 1;
    }

    const last = j === sorted.length;
    // The floor only applies where there is room for two floors, so it can
    // never push a later row out of the area.
    const floor = length >= minThickness * 2 ? minThickness : 0;
    let thickness = last ? length : sum / side;
    if (!last) thickness = Math.min(thickness, length - floor);
    thickness = Math.min(length, Math.max(thickness, floor));

    // Lengths along the row are proportional, except that no tile is shorter
    // than the floor while the row has room: the floored tiles take their
    // minimum and the rest share what remains. Gated on the row's own side,
    // independently of the thickness gate above.
    const lenFloor = side >= minThickness * 2 ? minThickness : 0;
    const lengths: number[] = [];
    let fixed = 0;
    let flexSum = 0;
    for (let k = i; k < j; k += 1) {
      const natural = (side * areas[k]) / sum;
      if (natural < lenFloor) fixed += lenFloor;
      else flexSum += areas[k];
    }
    if (fixed > 0 && side - fixed >= lenFloor && flexSum > 0) {
      for (let k = i; k < j; k += 1) {
        const natural = (side * areas[k]) / sum;
        lengths.push(natural < lenFloor ? lenFloor : ((side - fixed) * areas[k]) / flexSum);
      }
    } else {
      for (let k = i; k < j; k += 1) lengths.push((side * areas[k]) / sum);
    }

    let offset = 0;
    for (let k = i; k < j; k += 1) {
      const len = lengths[k - i];
      out.push({
        item: sorted[k],
        rect: across
          ? { x: x + offset, y, w: len, h: thickness }
          : { x, y: y + offset, w: thickness, h: len },
      });
      offset += len;
    }
    if (across) {
      y += thickness;
      h = Math.max(0, h - thickness);
    } else {
      x += thickness;
      w = Math.max(0, w - thickness);
    }
    i = j;
  }

  return out;
}

export function inset(r: Rect, by: number): Rect {
  return {
    x: r.x + by,
    y: r.y + by,
    w: Math.max(0, r.w - by * 2),
    h: Math.max(0, r.h - by * 2),
  };
}
