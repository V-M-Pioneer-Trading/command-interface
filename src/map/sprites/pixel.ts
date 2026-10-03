/**
 * Pixel-art primitives.
 *
 * Sprites are authored as character grids and compiled once, at module load,
 * into run-length-merged rectangles. Those become `<rect>`s inside an SVG
 * `<symbol>`, so a "pixel" is a vector square: crisp at any zoom, no binary
 * assets, no build step, and colours stay themeable (a palette entry may be
 * `currentColor` so ship hulls tint by nav status).
 */

/** One character per cell; `TRANSPARENT` marks an empty one. */
export type Grid = string[][];

/** A palette entry is a colour, or a [colour, opacity] pair when translucent. */
export type PaletteEntry = string | [string, number];
export type PaletteMap = Record<string, PaletteEntry>;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity: number;
}

/** What the sprite registry stores and `SpriteDefs` draws. */
export interface Sprite {
  id: string;
  size: number;
  rects: Rect[];
}

export interface Palette {
  palette: PaletteMap;
  /** Registers a colour on first use and returns the character that stands for it. */
  key(color: string, opacity?: number): string;
}

/** What every generator returns: the pieces `compileSprite` needs. */
export interface SpriteSource {
  size: number;
  grid: Grid;
  palette: PaletteMap;
}

const TRANSPARENT = ".";

/**
 * `array[index]` for an index the caller knows is in range. Under
 * `noUncheckedIndexedAccess` every read is `T | undefined`; this narrows it
 * where the old code relied on the index being valid, and throws where the old
 * code would have thrown a step later (destructuring or calling `undefined`).
 */
export function at<T>(array: readonly T[], index: number): T {
  const value = array[index];
  if (value === undefined) throw new RangeError(`index ${index} is outside 0..${array.length - 1}`);
  return value;
}

/** `record[key]` for a key every caller knows is present; throws instead of yielding undefined. */
export function lookup<V>(record: Readonly<Record<string, V>>, key: string): V {
  const value = record[key];
  if (value === undefined) throw new RangeError(`no entry for "${key}"`);
  return value;
}

/**
 * `grid[y][x] = char`, with the row lookup narrowed. A missing row throws, as
 * the unchecked write did. Deliberately no check on `x`: a fractional or
 * out-of-range column lands exactly where it used to (see the sprite-grid
 * invariant in CLAUDE.md).
 */
export function setCell(grid: Grid, x: number, y: number, char: string): void {
  at(grid, y)[x] = char;
}

const PALETTE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>?@!~^";

export function makeGrid(size: number, fill = TRANSPARENT): Grid {
  return Array.from({ length: size }, () => new Array<string>(size).fill(fill));
}

/**
 * Builds palette entries on demand and hands back the character to write into
 * the grid. Keeps sprite authors from having to invent char legends by hand.
 */
export function createPalette(): Palette {
  const seen = new Map<string, string>();
  const palette: PaletteMap = {};
  return {
    palette,
    key(color: string, opacity = 1) {
      const id = `${color}|${opacity}`;
      const existing = seen.get(id);
      if (existing) return existing;
      const char = PALETTE_CHARS[seen.size];
      if (!char) throw new Error("pixel palette overflow");
      seen.set(id, char);
      palette[char] = opacity === 1 ? color : [color, opacity];
      return char;
    },
  };
}

/**
 * Character grid → rectangles, merged horizontally then vertically. A 16x16
 * shaded sphere collapses from ~200 cells to ~50 rects.
 */
export function gridToRects(grid: Grid, palette: PaletteMap): Rect[] {
  interface OpenRect {
    x: number;
    y: number;
    w: number;
    h: number;
    entry: PaletteEntry;
  }
  const out: OpenRect[] = [];
  let open = new Map<string, OpenRect>();

  grid.forEach((row, y) => {
    const next = new Map<string, OpenRect>();
    let x = 0;
    while (x < row.length) {
      const char = row[x];
      const entry = char === undefined ? undefined : palette[char];
      if (char === undefined || char === TRANSPARENT || !entry) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === char) w += 1;
      const id = `${x}:${w}:${char}`;
      const above = open.get(id);
      if (above && above.y + above.h === y) {
        above.h += 1;
        next.set(id, above);
      } else {
        const rect = { x, y, w, h: 1, entry };
        out.push(rect);
        next.set(id, rect);
      }
      x += w;
    }
    open = next;
  });

  return out.map((r) => {
    const [fill, opacity] = Array.isArray(r.entry) ? r.entry : [r.entry, 1];
    return { x: r.x, y: r.y, w: r.w, h: r.h, fill, opacity };
  });
}

/** Smooth value noise on a small lattice — enough for continents and clouds. */
export function makeNoise(rand: () => number, cells = 3): (u: number, v: number) => number {
  const lattice: number[][] = [];
  for (let j = 0; j <= cells; j += 1) {
    const row: number[] = [];
    for (let i = 0; i <= cells; i += 1) row.push(rand());
    lattice.push(row);
  }
  const lat = (j: number, i: number) => at(at(lattice, j), i);
  return function sample(u: number, v: number) {
    const x = Math.min(0.9999, Math.max(0, u)) * cells;
    const y = Math.min(0.9999, Math.max(0, v)) * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lat(y0, x0) + (lat(y0, x0 + 1) - lat(y0, x0)) * sx;
    const bot = lat(y0 + 1, x0) + (lat(y0 + 1, x0 + 1) - lat(y0 + 1, x0)) * sx;
    return top + (bot - top) * sy;
  };
}

/** Cyclic noise around a circle — used to make rocks lumpy but seamless. */
export function makeAngularNoise(rand: () => number, cells = 7): (angle: number) => number {
  const v = Array.from({ length: cells }, () => rand());
  return function sample(angle: number) {
    const x = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * cells;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    const a = at(v, i % cells);
    const b = at(v, (i + 1) % cells);
    return a + (b - a) * s;
  };
}

// Light from the upper-left, slightly toward the viewer.
const LIGHT: readonly [number, number, number] = (() => {
  const [x, y, z] = [-0.45, -0.52, 0.72] as const;
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m] as const;
})();

/** Lambert term for a unit-sphere surface point, remapped to 0..1. */
export function sphereShade(dx: number, dy: number, nz: number): number {
  const lam = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
  return Math.max(0, Math.min(1, (lam + 0.2) / 1.05));
}

export function rampChar(pal: Palette, ramp: readonly string[], t: number): string {
  const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)));
  return pal.key(at(ramp, i));
}

/** Grid + palette → the shape stored in the sprite registry. */
export function compileSprite(id: string, size: number, grid: Grid, palette: PaletteMap): Sprite {
  return { id, size, rects: gridToRects(grid, palette) };
}

export function spriteFromRows(id: string, rows: readonly string[], palette: PaletteMap): Sprite {
  return compileSprite(id, at(rows, 0).length, rows.map((r) => r.split("")), palette);
}
