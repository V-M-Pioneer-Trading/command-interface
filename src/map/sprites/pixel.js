/**
 * Pixel-art primitives.
 *
 * Sprites are authored as character grids and compiled once, at module load,
 * into run-length-merged rectangles. Those become `<rect>`s inside an SVG
 * `<symbol>`, so a "pixel" is a vector square: crisp at any zoom, no binary
 * assets, no build step, and colours stay themeable (a palette entry may be
 * `currentColor` so ship hulls tint by nav status).
 */

const TRANSPARENT = ".";

const PALETTE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>?@!~^";

export function makeGrid(size, fill = TRANSPARENT) {
  return Array.from({ length: size }, () => new Array(size).fill(fill));
}

/**
 * Builds palette entries on demand and hands back the character to write into
 * the grid. Keeps sprite authors from having to invent char legends by hand.
 */
export function createPalette() {
  const seen = new Map();
  const palette = {};
  return {
    palette,
    key(color, opacity = 1) {
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
export function gridToRects(grid, palette) {
  const out = [];
  let open = new Map();

  grid.forEach((row, y) => {
    const next = new Map();
    let x = 0;
    while (x < row.length) {
      const char = row[x];
      if (char === TRANSPARENT || !palette[char]) {
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
        const rect = { x, y, w, h: 1, char };
        out.push(rect);
        next.set(id, rect);
      }
      x += w;
    }
    open = next;
  });

  return out.map((r) => {
    const entry = palette[r.char];
    const [fill, opacity] = Array.isArray(entry) ? entry : [entry, 1];
    return { x: r.x, y: r.y, w: r.w, h: r.h, fill, opacity };
  });
}

/** Smooth value noise on a small lattice — enough for continents and clouds. */
export function makeNoise(rand, cells = 3) {
  const lattice = [];
  for (let j = 0; j <= cells; j += 1) {
    const row = [];
    for (let i = 0; i <= cells; i += 1) row.push(rand());
    lattice.push(row);
  }
  return function sample(u, v) {
    const x = Math.min(0.9999, Math.max(0, u)) * cells;
    const y = Math.min(0.9999, Math.max(0, v)) * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lattice[y0][x0] + (lattice[y0][x0 + 1] - lattice[y0][x0]) * sx;
    const bot = lattice[y0 + 1][x0] + (lattice[y0 + 1][x0 + 1] - lattice[y0 + 1][x0]) * sx;
    return top + (bot - top) * sy;
  };
}

/** Cyclic noise around a circle — used to make rocks lumpy but seamless. */
export function makeAngularNoise(rand, cells = 7) {
  const v = Array.from({ length: cells }, () => rand());
  return function sample(angle) {
    const x = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * cells;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    const a = v[i % cells];
    const b = v[(i + 1) % cells];
    return a + (b - a) * s;
  };
}

// Light from the upper-left, slightly toward the viewer.
const LIGHT = (() => {
  const v = [-0.45, -0.52, 0.72];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / m);
})();

/** Lambert term for a unit-sphere surface point, remapped to 0..1. */
export function sphereShade(dx, dy, nz) {
  const lam = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
  return Math.max(0, Math.min(1, (lam + 0.2) / 1.05));
}

export function rampChar(pal, ramp, t) {
  const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)));
  return pal.key(ramp[i]);
}

/** Grid + palette → the shape stored in the sprite registry. */
export function compileSprite(id, size, grid, palette) {
  return { id, size, rects: gridToRects(grid, palette) };
}

export function spriteFromRows(id, rows, palette) {
  return compileSprite(id, rows[0].length, rows.map((r) => r.split("")), palette);
}
