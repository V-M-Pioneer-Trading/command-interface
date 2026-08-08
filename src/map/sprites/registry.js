/**
 * The sprite registry: every waypoint type, ship family and badge, compiled to
 * rects once at module load.
 *
 * Celestial bodies use naturalistic colour ramps (blue oceans, banded gas
 * giants, grey cratered moons) — the LCARS palette stays on the UI chrome
 * around them: labels, orbit rings, transit paths, selection and badges.
 */

import { compileSprite, hash32 } from "./pixel";
import {
  makeCluster,
  makeNebula,
  makeRingStructure,
  makeRock,
  makeSphere,
  makeTank,
  makeWell,
} from "./generators";
import { BADGE_SPRITES, SHIP_SPRITES } from "./ships";

const RAMPS = {
  ocean: ["#08203f", "#0f3a6b", "#1a5f9e", "#2f8ccc", "#5fb4e8"],
  land: ["#12331a", "#1f5426", "#357f36", "#55a84c", "#83cb72"],
  desert: ["#4a2c11", "#75471b", "#a76d2c", "#d19a4c", "#eec27f"],
  desertAlt: ["#5d3a17", "#8a5722", "#bb8038", "#e2ae5e", "#f7d79b"],
  basalt: ["#1a0d0c", "#33130f", "#4d1e16", "#6b2c1e", "#8c4029"],
  lava: ["#7a2408", "#b2440f", "#e0741c", "#ff9f33", "#ffd36b"],
  jovian: ["#4c3218", "#775027", "#a7773c", "#cda062", "#ecc894"],
  jovianAlt: ["#5e401f", "#8d6231", "#bd8d4b", "#e0b578", "#f7dcae"],
  storm: ["#6b1f10", "#96341a", "#c05327", "#e07d3f", "#f0a763"],
  iceGiant: ["#0d2f3d", "#144a5e", "#1e7186", "#309cb0", "#57c4d3"],
  iceGiantAlt: ["#113c4d", "#1a5b70", "#28869c", "#3fb0c4", "#6fd6e2"],
  moonGrey: ["#2b2b33", "#43434f", "#5f5f6f", "#82828f", "#a6a6b3"],
  moonTan: ["#332a21", "#4d4033", "#6d5c48", "#8f7c63", "#b3a184"],
  rock: ["#2a241f", "#413830", "#5c5045", "#7a6a5b", "#998874"],
  metal: ["#242a30", "#39424c", "#525f6d", "#71818f", "#95a6b5"],
  debris: ["#22252b", "#363b45", "#4c535f", "#666f7d", "#87909e"],
  station: ["#1d2330", "#333c50", "#4d5a75", "#6d7d9c", "#95a7c6"],
  gate: ["#1b2c26", "#2b4a3c", "#3d6f57", "#54987a", "#76c4a1"],
  tank: ["#3a2a12", "#5c441d", "#86672c", "#b08c45", "#d6b473"],
};

/** On-screen icon size in px at zoom 1 (grows by scale^0.3 from there). */
export const WAYPOINT_BASE_SIZE = {
  GAS_GIANT: 30,
  PLANET: 24,
  NEBULA: 26,
  GRAVITY_WELL: 22,
  ARTIFICIAL_GRAVITY_WELL: 22,
  JUMP_GATE: 20,
  ASTEROID_FIELD: 18,
  DEBRIS_FIELD: 18,
  ORBITAL_STATION: 18,
  ASTEROID_BASE: 15,
  MOON: 13,
  ENGINEERED_ASTEROID: 13,
  FUEL_STATION: 12,
  ASTEROID: 11,
};

const DEFAULT_BASE_SIZE = 12;

/** Types that keep their label at low zoom; everything else waits for 2x. */
export const MAJOR_TYPES = new Set([
  "PLANET",
  "GAS_GIANT",
  "JUMP_GATE",
  "ORBITAL_STATION",
  "ASTEROID_BASE",
]);

function metalBandOverlay({ grid, pal, size, center }) {
  const band = ["#3b4550", "#61707f", "#93a6b8"];
  for (let i = 0; i < band.length; i += 1) {
    const py = Math.round(center) - 1 + i;
    if (py < 0 || py >= size) continue;
    for (let px = 0; px < size; px += 1) {
      if (grid[py][px] === ".") continue;
      grid[py][px] = pal.key(band[i]);
    }
  }
  // Rig lights on the band.
  const lightRow = Math.round(center);
  for (const px of [Math.round(center) - 4, Math.round(center) + 3]) {
    if (px >= 0 && px < size && grid[lightRow][px] !== ".") {
      grid[lightRow][px] = pal.key("#ffcc33");
    }
  }
}

function domeOverlay({ grid, pal, size, center }) {
  const shell = ["#2f3a4b", "#4d5d78", "#7a8ea9"];
  const domes = [
    { cx: center - 2.5, cy: center - 1.5, r: 2.4 },
    { cx: center + 2.5, cy: center + 0.5, r: 1.8 },
  ];
  for (const dome of domes) {
    for (let py = 0; py < size; py += 1) {
      for (let px = 0; px < size; px += 1) {
        const dx = (px - dome.cx) / dome.r;
        const dy = (py - dome.cy) / dome.r;
        if (dy > 0.15) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const i = d2 > 0.62 ? 0 : dx < -0.2 ? 2 : 1;
        grid[py][px] = pal.key(shell[i]);
      }
    }
    const wy = Math.round(dome.cy - dome.r * 0.35);
    const wx = Math.round(dome.cx);
    if (wy >= 0 && wy < size && wx >= 0 && wx < size) grid[wy][wx] = pal.key("#ffe9a8");
  }
}

/**
 * type -> array of generator thunks. Index is picked from hash(symbol), so a
 * given waypoint always looks the same and a system never reads as copy-paste.
 */
const WAYPOINT_VARIANTS = {
  PLANET: [
    () => makeSphere({ seed: 11, base: RAMPS.ocean, alt: RAMPS.land, blotch: 0.52 }),
    () => makeSphere({ seed: 23, base: RAMPS.desert, alt: RAMPS.desertAlt, blotch: 0.48 }),
    () => makeSphere({ seed: 37, base: RAMPS.basalt, alt: RAMPS.lava, blotch: 0.64 }),
  ],
  GAS_GIANT: [
    () =>
      makeSphere({
        seed: 5,
        base: RAMPS.jovian,
        alt: RAMPS.jovianAlt,
        bands: 3.4,
        spot: { x: 0.26, y: 0.24, rx: 0.32, ry: 0.19, ramp: RAMPS.storm },
      }),
    () => makeSphere({ seed: 9, base: RAMPS.iceGiant, alt: RAMPS.iceGiantAlt, bands: 4.2 }),
  ],
  MOON: [
    () => makeSphere({ seed: 3, base: RAMPS.moonGrey, craters: 5 }),
    () => makeSphere({ seed: 8, base: RAMPS.moonTan, craters: 4 }),
  ],
  ASTEROID: [
    () => makeRock({ seed: 2, ramp: RAMPS.rock, radius: 6.4, speckles: 3 }),
    () => makeRock({ seed: 14, ramp: RAMPS.rock, radius: 6.8, roughness: 0.36, speckles: 2 }),
    () => makeRock({ seed: 29, ramp: RAMPS.rock, radius: 6.0, roughness: 0.24, speckles: 4 }),
  ],
  ENGINEERED_ASTEROID: [
    () => makeRock({ seed: 7, ramp: RAMPS.metal, radius: 6.4, roughness: 0.2, speckles: 1, overlay: metalBandOverlay }),
  ],
  ASTEROID_BASE: [
    () => makeRock({ seed: 17, ramp: RAMPS.rock, radius: 6.6, roughness: 0.22, speckles: 1, overlay: domeOverlay }),
  ],
  ASTEROID_FIELD: [
    () => makeCluster({ seed: 4, ramp: RAMPS.rock, count: 6 }),
    () => makeCluster({ seed: 21, ramp: RAMPS.rock, count: 5, maxRadius: 3.9 }),
    () => makeCluster({ seed: 33, ramp: RAMPS.rock, count: 7, maxRadius: 2.9 }),
  ],
  DEBRIS_FIELD: [
    () => makeCluster({ seed: 12, ramp: RAMPS.debris, count: 7, minRadius: 1.1, maxRadius: 2.6, roughness: 0.55 }),
  ],
  NEBULA: [
    () =>
      makeNebula({
        seed: 6,
        colors: [
          ["#3a1f6b", 0.35],
          ["#5a2f96", 0.5],
          ["#7d47c2", 0.62],
          ["#a06fe0", 0.72],
          ["#cfa6f5", 0.82],
        ],
      }),
  ],
  ORBITAL_STATION: [
    () =>
      makeRingStructure({
        seed: 15,
        ramp: RAMPS.station,
        rOuter: 7.3,
        rInner: 5.3,
        hubRadius: 2.4,
        spokes: 4,
        spokeWidth: 1.6,
        lights: 6,
        lightColor: "#ffe9a8",
      }),
  ],
  JUMP_GATE: [
    () =>
      makeRingStructure({
        seed: 19,
        ramp: RAMPS.gate,
        rOuter: 6.4,
        rInner: 4.6,
        pylons: 4,
        pylonLength: 1,
        glow: [
          ["#1d7f6b", 0.28],
          ["#33cc99", 0.42],
          ["#6ef0c8", 0.6],
        ],
      }),
  ],
  FUEL_STATION: [() => makeTank({ ramp: RAMPS.tank, accent: "#ffcc33" })],
  GRAVITY_WELL: [
    () =>
      makeWell({
        coreColor: "#05060a",
        ringColors: [
          ["#7788ff", 0.8],
          ["#5566cc", 0.55],
          ["#33408f", 0.34],
        ],
      }),
  ],
  ARTIFICIAL_GRAVITY_WELL: [
    () =>
      makeWell({
        coreColor: "#05060a",
        ringColors: [
          ["#57e0d8", 0.82],
          ["#33ccaa", 0.55],
          ["#1d7f6b", 0.34],
        ],
        frame: "#33cc99",
      }),
  ],
  UNKNOWN: [() => makeRock({ seed: 99, ramp: RAMPS.debris, radius: 5.2, roughness: 0.18, speckles: 2 })],
};

const registry = new Map();

Object.entries(WAYPOINT_VARIANTS).forEach(([type, variants]) => {
  variants.forEach((build, i) => {
    const id = `wp-${type}-${i}`;
    const { size, grid, palette } = build();
    registry.set(id, compileSprite(id, size, grid, palette));
  });
});

[...SHIP_SPRITES, ...BADGE_SPRITES].forEach((sprite) => registry.set(sprite.id, sprite));

export const SPRITES = registry;

export function getSprite(id) {
  return registry.get(id) || null;
}

export function waypointSpriteId(symbol, type) {
  const variants = WAYPOINT_VARIANTS[type] ? type : "UNKNOWN";
  const count = WAYPOINT_VARIANTS[variants].length;
  const i = count === 1 ? 0 : hash32(symbol) % count;
  return `wp-${variants}-${i}`;
}

export function waypointBaseSize(type) {
  return WAYPOINT_BASE_SIZE[type] || DEFAULT_BASE_SIZE;
}
