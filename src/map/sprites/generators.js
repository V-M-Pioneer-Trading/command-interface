/**
 * Procedural sprite generators.
 *
 * Round and irregular bodies are generated rather than hand-drawn: it keeps
 * spheres perfectly symmetric, gives real shading ramps, and makes per-waypoint
 * variants a matter of changing the seed. Structures (stations, gates, wells)
 * are composed from the same masks so everything shares one light direction.
 */

import {
  createPalette,
  makeAngularNoise,
  makeGrid,
  makeNoise,
  mulberry32,
  rampChar,
  sphereShade,
} from "./pixel";

/**
 * Shaded sphere with optional continents (`blotch`), banding (`bands`),
 * craters, polar caps and a storm spot.
 */
export function makeSphere({
  size = 16,
  seed = 1,
  base,
  alt = null,
  ice = null,
  bands = 0,
  blotch = 0,
  craters = 0,
  capAt = 0,
  spot = null,
}) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const rand = mulberry32(seed);
  const noise = makeNoise(rand, 3);
  const bandPhase = rand() * Math.PI * 2;

  const craterList = [];
  for (let i = 0; i < craters; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.74;
    craterList.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.13 + rand() * 0.15 });
  }

  const c = (size - 1) / 2;
  const r = size / 2 - 0.5;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const dx = (px - c) / r;
      const dy = (py - c) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;

      const nz = Math.sqrt(Math.max(0, 1 - d2));
      let t = sphereShade(dx, dy, nz);
      let ramp = base;

      if (blotch > 0 && alt && noise((dx + 1) / 2, (dy + 1) / 2) > blotch) ramp = alt;

      if (bands > 0) {
        const b = Math.sin(dy * Math.PI * bands + bandPhase);
        if (alt && b > 0.15) ramp = alt;
        t += b * 0.06;
      }

      if (spot) {
        const sx = (dx - spot.x) / spot.rx;
        const sy = (dy - spot.y) / spot.ry;
        if (sx * sx + sy * sy < 1) ramp = spot.ramp;
      }

      if (capAt > 0 && ice && Math.abs(dy) > capAt) ramp = ice;

      for (const cr of craterList) {
        const cd = Math.hypot(dx - cr.x, dy - cr.y);
        if (cd < cr.r) t -= 0.22;
        else if (cd < cr.r * 1.4) t += 0.1;
      }

      if (d2 > 0.8) t -= 0.15;

      grid[py][px] = rampChar(pal, ramp, t);
    }
  }

  return { size, grid, palette: pal.palette };
}

function stampRock(grid, pal, rand, { cx, cy, radius, ramp, roughness = 0.3, speckles = 0 }) {
  const angNoise = makeAngularNoise(rand, 7);
  const spots = [];
  for (let i = 0; i < speckles; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.6;
    spots.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.14 + rand() * 0.14 });
  }

  const size = grid.length;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const ox = px - cx;
      const oy = py - cy;
      const dist = Math.hypot(ox, oy);
      const angle = Math.atan2(oy, ox);
      const rr = radius * (1 + roughness * (angNoise(angle) - 0.5) * 2);
      if (dist > rr || rr <= 0) continue;

      const dx = ox / rr;
      const dy = oy / rr;
      const d2 = Math.min(1, dx * dx + dy * dy);
      let t = sphereShade(dx, dy, Math.sqrt(1 - d2));
      for (const s of spots) {
        if (Math.hypot(dx - s.x, dy - s.y) < s.r) t -= 0.2;
      }
      if (d2 > 0.78) t -= 0.12;
      grid[py][px] = rampChar(pal, ramp, t);
    }
  }
}

/**
 * Single lumpy rock. `overlay` gets the raw grid/palette back so derived types
 * (engineered asteroid, asteroid base) can bolt structures onto the same rock.
 */
export function makeRock({
  size = 16,
  seed = 1,
  ramp,
  radius = 6.6,
  roughness = 0.3,
  speckles = 3,
  overlay = null,
}) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const rand = mulberry32(seed);
  const c = (size - 1) / 2;
  stampRock(grid, pal, rand, { cx: c, cy: c, radius, ramp, roughness, speckles });
  if (overlay) overlay({ grid, pal, rand, size, center: c, radius });
  return { size, grid, palette: pal.palette };
}

/** Several small rocks scattered across the tile (asteroid / debris fields). */
export function makeCluster({
  size = 16,
  seed = 1,
  ramp,
  count = 5,
  minRadius = 1.6,
  maxRadius = 3.4,
  roughness = 0.35,
  spread = 5.4,
}) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const rand = mulberry32(seed);
  const c = (size - 1) / 2;

  const blobs = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.9;
    const d = (0.35 + rand() * 0.65) * spread;
    blobs.push({
      cx: c + Math.cos(a) * d,
      cy: c + Math.sin(a) * d,
      radius: minRadius + rand() * (maxRadius - minRadius),
    });
  }
  // Far rocks first so near ones overdraw them.
  blobs.sort((a, b) => a.radius - b.radius);
  for (const b of blobs) {
    stampRock(grid, pal, rand, { ...b, ramp, roughness, speckles: 0 });
  }

  return { size, grid, palette: pal.palette };
}

/** Soft dithered cloud — nebulae read as translucent rather than solid. */
export function makeNebula({ size = 16, seed = 1, colors }) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const rand = mulberry32(seed);
  const coarse = makeNoise(rand, 2);
  const fine = makeNoise(rand, 5);
  const c = (size - 1) / 2;
  const r = size / 2 - 0.5;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const dx = (px - c) / r;
      const dy = (py - c) / r;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const n = coarse((dx + 1) / 2, (dy + 1) / 2) * 0.7 + fine((dx + 1) / 2, (dy + 1) / 2) * 0.3;
      const density = n * (1 - d * d);
      if (density < 0.18) continue;
      // Checker dither on the thin outer wisps keeps the edge from looking cut.
      if (density < 0.3 && (px + py) % 2 === 0) continue;
      const i = Math.min(colors.length - 1, Math.floor(((density - 0.18) / 0.45) * colors.length));
      const [color, opacity] = colors[i];
      grid[py][px] = pal.key(color, opacity);
    }
  }

  return { size, grid, palette: pal.palette };
}

/**
 * Torus-style structure: an outer ring, an optional hub, spokes and window
 * lights. Backs both ORBITAL_STATION and JUMP_GATE.
 */
export function makeRingStructure({
  size = 16,
  ramp,
  rOuter = 7.3,
  rInner = 5.2,
  hubRadius = 0,
  spokes = 0,
  spokeWidth = 1,
  lights = 0,
  lightColor = null,
  glow = null,
  pylons = 0,
  pylonLength = 0,
  seed = 1,
}) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const rand = mulberry32(seed);
  const c = (size - 1) / 2;

  const inRing = (x, y) => {
    const d = Math.hypot(x - c, y - c);
    return d <= rOuter && d >= rInner;
  };

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const dx = (px - c) / rOuter;
      const dy = (py - c) / rOuter;
      const d = Math.hypot(dx, dy);

      if (glow && d <= rInner / rOuter) {
        const strength = 1 - d / (rInner / rOuter);
        if (strength > 0.08) {
          const i = Math.min(glow.length - 1, Math.floor(strength * glow.length));
          const [color, opacity] = glow[i];
          grid[py][px] = pal.key(color, opacity);
        }
      }

      if (hubRadius > 0 && Math.hypot(px - c, py - c) <= hubRadius) {
        const hx = (px - c) / hubRadius;
        const hy = (py - c) / hubRadius;
        const h2 = Math.min(1, hx * hx + hy * hy);
        grid[py][px] = rampChar(pal, ramp, sphereShade(hx, hy, Math.sqrt(1 - h2)));
      }

      if (spokes > 0) {
        const half = spokeWidth / 2;
        const onSpoke =
          (Math.abs(px - c) <= half && Math.abs(py - c) <= rOuter) ||
          (spokes > 2 && Math.abs(py - c) <= half && Math.abs(px - c) <= rOuter);
        if (onSpoke && Math.hypot(px - c, py - c) <= rOuter) {
          grid[py][px] = rampChar(pal, ramp, 0.45);
        }
      }

      if (inRing(px, py)) {
        // Shade the ring as a tube: bright on the upper-left face.
        const t = sphereShade(dx, dy, 0.35) * 0.85 + 0.12;
        grid[py][px] = rampChar(pal, ramp, t);
      }
    }
  }

  for (let i = 0; i < pylons; i += 1) {
    const a = (i / pylons) * Math.PI * 2 + Math.PI / pylons;
    for (let step = 0; step <= pylonLength * 2; step += 1) {
      const d = rOuter - 0.5 + step / 2;
      const px = Math.round(c + Math.cos(a) * d);
      const py = Math.round(c + Math.sin(a) * d);
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      grid[py][px] = rampChar(pal, ramp, step === 0 ? 0.7 : 0.3);
    }
  }

  if (lights > 0 && lightColor) {
    const mid = (rOuter + rInner) / 2;
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < lights; i += 1) {
      const a = phase + (i / lights) * Math.PI * 2;
      const px = Math.round(c + Math.cos(a) * mid);
      const py = Math.round(c + Math.sin(a) * mid);
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      grid[py][px] = pal.key(lightColor);
    }
  }

  return { size, grid, palette: pal.palette };
}

/** Concentric distortion rings around a dark core — gravity wells. */
export function makeWell({ size = 16, coreColor, ringColors, ringSpacing = 1.8, coreRadius = 2.2, frame = null }) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const c = (size - 1) / 2;
  const rMax = size / 2 - 0.5;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const d = Math.hypot(px - c, py - c);
      if (d > rMax) continue;
      if (d <= coreRadius) {
        grid[py][px] = pal.key(coreColor);
        continue;
      }
      const band = (d - coreRadius) / ringSpacing;
      if (band % 2 >= 1) continue;
      const fade = 1 - (d - coreRadius) / (rMax - coreRadius);
      const i = Math.min(ringColors.length - 1, Math.max(0, Math.floor(fade * ringColors.length)));
      const [color, opacity] = ringColors[i];
      grid[py][px] = pal.key(color, opacity);
    }
  }

  if (frame) {
    const corners = [
      [1, 1, 1, 1],
      [size - 2, 1, -1, 1],
      [1, size - 2, 1, -1],
      [size - 2, size - 2, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      grid[y][x] = pal.key(frame);
      grid[y][x + sx] = pal.key(frame);
      grid[y + sy][x] = pal.key(frame);
    }
  }

  return { size, grid, palette: pal.palette };
}

/** Blocky depot: tank body, end caps, support fins. */
export function makeTank({ size = 16, ramp, accent }) {
  const grid = makeGrid(size);
  const pal = createPalette();
  const c = (size - 1) / 2;

  const left = 4;
  const right = size - 5;
  const top = 3;
  const bottom = size - 4;

  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      const dx = (px - c) / ((right - left) / 2);
      const dy = (py - c) / ((bottom - top) / 2);
      // Round the vertical ends so it reads as a pressure vessel, not a box.
      if (Math.abs(dy) > 0.72 && Math.abs(dx) > 0.72) continue;
      const t = sphereShade(dx, 0, Math.sqrt(Math.max(0, 1 - dx * dx))) * 0.9 + 0.08;
      grid[py][px] = rampChar(pal, ramp, t);
    }
  }

  // Banding rings + a valve stack on top.
  for (let px = left; px <= right; px += 1) {
    grid[top + 2][px] = rampChar(pal, ramp, 0.2);
    grid[bottom - 2][px] = rampChar(pal, ramp, 0.2);
  }
  grid[top - 1][c] = pal.key(accent);
  grid[top - 1][c + 1] = pal.key(accent);
  grid[bottom + 1][left + 1] = rampChar(pal, ramp, 0.25);
  grid[bottom + 1][right - 1] = rampChar(pal, ramp, 0.25);

  return { size, grid, palette: pal.palette };
}
