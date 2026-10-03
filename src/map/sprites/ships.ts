/**
 * Ship and badge sprites — hand-drawn, because a silhouette has to be
 * *intentional* to read at 12px.
 *
 * Hull tones use `currentColor` so a ship tints by nav status (docked / in
 * orbit / in transit) from the `color` property set on the `<use>`; the outline,
 * canopy and engine glow stay fixed so the shape survives any tint.
 */

import { lookup, spriteFromRows, type PaletteMap, type Sprite } from "./pixel";

const HULL: PaletteMap = {
  o: "#05070c",
  d: ["currentColor", 0.45],
  m: ["currentColor", 0.74],
  l: "currentColor",
  h: ["#ffffff", 0.55],
  w: ["#9fe8ff", 0.9],
  e: ["#ffd45a", 0.95],
};

// 16 SpaceTraders frames collapse to 5 silhouette families, sized so a bulk
// freighter visibly outmasses a probe.
const SHIP_FAMILY_ROWS: Record<ShipFamily, string[]> = {
  tiny: [
    "............",
    "............",
    ".....oo.....",
    "....ollo....",
    "....olmo....",
    "...oolmoo...",
    "...ohlmho...",
    "...odmmdo...",
    "....oeeo....",
    ".....ee.....",
    "............",
    "............",
  ],
  small: [
    ".....oo.....",
    "....olho....",
    "....olmo....",
    "....olmo....",
    "...oolmoo...",
    "..oolwmloo..",
    ".oodlmmldoo.",
    ".odmlmmlmdo.",
    ".oo.dmmd.oo.",
    "....oeeo....",
    ".....ee.....",
    "............",
  ],
  utility: [
    ".....oo.....",
    "....ollo....",
    "....olmo....",
    "....olwo....",
    ".omoolmoodo.",
    ".oloolmoodo.",
    ".oloolmoodo.",
    ".omoolmoodo.",
    "...oolmoo...",
    "....odmo....",
    "....oeeo....",
    ".....ee.....",
  ],
  combat: [
    ".....oo.....",
    "....olho....",
    "....olmo....",
    "....olmo....",
    "...oolmoo...",
    "..ohllmmdo..",
    ".ohlllmmmdo.",
    ".oodolmodoo.",
    "....odmo....",
    "....oeeo....",
    ".....ee.....",
    "............",
  ],
  bulk: [
    "....oooo....",
    "...ollmmo...",
    "..ollwwmmo..",
    ".olllmmmmdo.",
    ".ololmmomdo.",
    ".olllmmmmdo.",
    ".ololmmomdo.",
    ".olllmmmmdo.",
    ".oooooooooo.",
    "...oeeeeo...",
    "....eeee....",
    "............",
  ],
};

export type ShipFamily = "tiny" | "small" | "utility" | "combat" | "bulk";

const FRAME_FAMILY: Record<string, ShipFamily> = {
  FRAME_PROBE: "tiny",
  FRAME_DRONE: "tiny",
  FRAME_SHUTTLE: "small",
  FRAME_RACER: "small",
  FRAME_FIGHTER: "combat",
  FRAME_INTERCEPTOR: "combat",
  FRAME_DESTROYER: "combat",
  FRAME_CRUISER: "combat",
  FRAME_MINER: "utility",
  FRAME_EXPLORER: "utility",
  FRAME_FRIGATE: "utility",
  FRAME_LIGHT_FREIGHTER: "bulk",
  FRAME_HEAVY_FREIGHTER: "bulk",
  FRAME_BULK_FREIGHTER: "bulk",
  FRAME_TRANSPORT: "bulk",
  FRAME_CARRIER: "bulk",
};

export const SHIP_FAMILY_SIZE: Record<ShipFamily, number> = {
  tiny: 13,
  small: 15,
  utility: 17,
  combat: 17,
  bulk: 20,
};

export function shipFamily(frameSymbol: string | undefined): ShipFamily {
  return (frameSymbol === undefined ? undefined : FRAME_FAMILY[frameSymbol]) ?? "utility";
}

export const SHIP_SPRITES: Sprite[] = Object.entries(SHIP_FAMILY_ROWS).map(([family, rows]) =>
  spriteFromRows(`ship-${family}`, rows, HULL),
);

// ── Badges ────────────────────────────────────────────────────────────────
// 5x5 glyphs stamped at the corners of an icon. Only the roles this fleet
// actually flies get one; everything else renders bare.

function badge(id: string, rows: string[], color: string): Sprite {
  return spriteFromRows(id, rows, { x: color, o: "#05070c" });
}

const ROLE_GLYPHS: Record<string, string[]> = {
  EXCAVATOR: ["x...x", ".x.x.", "..x..", ".xxx.", "..x.."],
  HAULER: ["xxxxx", "x...x", "x...x", "x...x", "xxxxx"],
  SURVEYOR: ["..x..", ".x.x.", "x...x", ".x.x.", "..x.."],
  SATELLITE: ["..x..", ".xxx.", "xxxxx", "..x..", "..x.."],
  COMMAND: ["x.x.x", "xxxxx", ".xxx.", "..x..", "....."],
};

const TRAIT_GLYPHS: Record<string, string[]> = {
  MARKETPLACE: [".xxx.", "x...x", "x.x.x", "x...x", ".xxx."],
  SHIPYARD: ["xxxxx", "..x..", "..x..", ".x.x.", "x...x"],
  UNDER_CONSTRUCTION: ["x..x.", ".x..x", "x..x.", ".x..x", "x..x."],
};

export const ROLE_BADGE_COLOR: Record<string, string> = {
  EXCAVATOR: "#ffcc33",
  HAULER: "#33cc99",
  SURVEYOR: "#7788ff",
  SATELLITE: "#cc88ff",
  COMMAND: "#ff9900",
};

export const TRAIT_BADGE_COLOR: Record<string, string> = {
  MARKETPLACE: "#33cc99",
  SHIPYARD: "#cc88ff",
  UNDER_CONSTRUCTION: "#ffcc33",
};

export const BADGE_SPRITES: Sprite[] = [
  ...Object.entries(ROLE_GLYPHS).map(([role, rows]) =>
    badge(`role-${role}`, rows, lookup(ROLE_BADGE_COLOR, role)),
  ),
  ...Object.entries(TRAIT_GLYPHS).map(([trait, rows]) =>
    badge(`trait-${trait}`, rows, lookup(TRAIT_BADGE_COLOR, trait)),
  ),
];

export function roleBadgeId(role: string | undefined): string | null {
  return role !== undefined && ROLE_GLYPHS[role] ? `role-${role}` : null;
}

export function traitBadgeId(trait: string): string | null {
  return TRAIT_GLYPHS[trait] ? `trait-${trait}` : null;
}

// A 5x5 glyph can hint at a meaning but never state one — hovering a badge
// spells it out.
export const BADGE_LABEL: Record<string, string> = {
  "trait-MARKETPLACE": "Marketplace — buy & sell cargo",
  "trait-SHIPYARD": "Shipyard — purchase ships",
  "trait-UNDER_CONSTRUCTION": "Under construction",
  "role-EXCAVATOR": "Excavator — mines asteroids",
  "role-HAULER": "Hauler — moves cargo",
  "role-SURVEYOR": "Surveyor — scans for deposits",
  "role-SATELLITE": "Satellite — stationary probe",
  "role-COMMAND": "Command ship",
};
