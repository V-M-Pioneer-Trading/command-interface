import { describe, expect, it } from "vitest";
import { gridToRects, spriteFromRows } from "./pixel";
import { mulberry32 } from "../rand";
import { makeTank } from "./generators";
import { SPRITES, waypointBaseSize, waypointSpriteId } from "./registry";
import { SHIP_FAMILY_SIZE, shipFamily } from "./ships";

// Every type the SpaceTraders WaypointType enum can return.
const WAYPOINT_TYPES = [
  "PLANET",
  "GAS_GIANT",
  "MOON",
  "ORBITAL_STATION",
  "JUMP_GATE",
  "ASTEROID_FIELD",
  "ASTEROID",
  "ENGINEERED_ASTEROID",
  "ASTEROID_BASE",
  "NEBULA",
  "DEBRIS_FIELD",
  "GRAVITY_WELL",
  "ARTIFICIAL_GRAVITY_WELL",
  "FUEL_STATION",
];

const rows = (...r) => r.map((s) => s.split(""));

describe("gridToRects", () => {
  const palette = { a: "#f00", b: "#0f0" };

  it("merges horizontally and then vertically", () => {
    const rects = gridToRects(rows("..aa..", "..aa..", "..bb.."), palette);
    expect(rects).toEqual([
      { x: 2, y: 0, w: 2, h: 2, fill: "#f00", opacity: 1 },
      { x: 2, y: 2, w: 2, h: 1, fill: "#0f0", opacity: 1 },
    ]);
  });

  it("does not bridge a gap row", () => {
    expect(gridToRects(rows("aa", "..", "aa"), palette)).toHaveLength(2);
  });

  it("does not merge runs of different width", () => {
    const rects = gridToRects(rows("aa.", "aaa"), palette);
    expect(rects).toHaveLength(2);
    expect(rects[1]).toMatchObject({ x: 0, y: 1, w: 3, h: 1 });
  });

  it("carries opacity from tuple palette entries", () => {
    const [rect] = gridToRects(rows("a"), { a: ["currentColor", 0.5] });
    expect(rect).toMatchObject({ fill: "currentColor", opacity: 0.5 });
  });

  it("skips characters with no palette entry", () => {
    expect(gridToRects(rows("..z.."), palette)).toEqual([]);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("spriteFromRows", () => {
  it("keeps the grid square and records its size", () => {
    const sprite = spriteFromRows("t", ["ab", "ba"], { a: "#111", b: "#222" });
    expect(sprite.size).toBe(2);
    expect(sprite.rects).toHaveLength(4);
  });
});

describe("registry", () => {
  it("has a sprite and a size for every waypoint type", () => {
    for (const type of WAYPOINT_TYPES) {
      const id = waypointSpriteId("X1-AA-Z1", type);
      expect(id).toContain(type);
      expect(SPRITES.get(id)).toBeTruthy();
      expect(waypointBaseSize(type)).toBeGreaterThan(0);
    }
  });

  it("falls back to a generic sprite for an unrecognised type", () => {
    const id = waypointSpriteId("X1-AA-Z1", "WORMHOLE_OF_THE_FUTURE");
    expect(SPRITES.get(id)).toBeTruthy();
  });

  it("picks a stable variant per symbol", () => {
    expect(waypointSpriteId("X1-AA-P1", "PLANET")).toBe(waypointSpriteId("X1-AA-P1", "PLANET"));
    const used = new Set(
      Array.from({ length: 40 }, (_, i) => waypointSpriteId(`X1-AA-P${i}`, "PLANET")),
    );
    expect(used.size).toBeGreaterThan(1);
  });

  // Regression: `makeTank` wrote its accent valve at `grid[y][c]` with
  // `c = (size - 1) / 2` — 7.5 on the 16px grid. That assigns a string-keyed
  // property to the row array rather than a cell, so the pixel vanished
  // silently and FUEL_STATION compiled with no accent colour at all.
  it("draws the fuel station's accent valve", () => {
    const { grid, palette } = makeTank({ ramp: ["#111", "#222", "#333"], accent: "#ffcc33" });
    const accentChars = Object.entries(palette)
      .filter(([, value]) => value === "#ffcc33")
      .map(([char]) => char);

    expect(accentChars).toHaveLength(1);
    expect(grid.flat().filter((cell) => cell === accentChars[0])).toHaveLength(2);
    expect(SPRITES.get("wp-FUEL_STATION-0").rects.some((r) => r.fill === "#ffcc33")).toBe(true);
  });

  // The general form of that bug: every write into a grid must land on an
  // integer cell, or gridToRects never sees it.
  it("leaves no fractional cells on any generated sprite grid", () => {
    const { grid } = makeTank({ ramp: ["#111", "#222", "#333"], accent: "#ffcc33" });
    for (const row of grid) {
      expect(Object.keys(row).every((key) => Number.isInteger(Number(key)))).toBe(true);
    }
  });

  it("produces non-empty sprites", () => {
    for (const sprite of SPRITES.values()) {
      expect(sprite.rects.length).toBeGreaterThan(0);
      expect(sprite.rects.every((r) => r.w > 0 && r.h > 0)).toBe(true);
    }
  });
});

describe("ship families", () => {
  const FRAMES = [
    "FRAME_PROBE",
    "FRAME_DRONE",
    "FRAME_INTERCEPTOR",
    "FRAME_RACER",
    "FRAME_FIGHTER",
    "FRAME_FRIGATE",
    "FRAME_SHUTTLE",
    "FRAME_EXPLORER",
    "FRAME_MINER",
    "FRAME_LIGHT_FREIGHTER",
    "FRAME_HEAVY_FREIGHTER",
    "FRAME_TRANSPORT",
    "FRAME_DESTROYER",
    "FRAME_CRUISER",
    "FRAME_CARRIER",
    "FRAME_BULK_FREIGHTER",
  ];

  it("maps every frame to a sprite that exists", () => {
    for (const frame of [...FRAMES, undefined, "FRAME_UNKNOWN"]) {
      const family = shipFamily(frame);
      expect(SPRITES.get(`ship-${family}`)).toBeTruthy();
      expect(SHIP_FAMILY_SIZE[family]).toBeGreaterThan(0);
    }
  });

  it("draws a bulk freighter bigger than a probe", () => {
    expect(SHIP_FAMILY_SIZE[shipFamily("FRAME_BULK_FREIGHTER")]).toBeGreaterThan(
      SHIP_FAMILY_SIZE[shipFamily("FRAME_PROBE")],
    );
  });
});
