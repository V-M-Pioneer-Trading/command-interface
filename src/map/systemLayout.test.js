import { describe, expect, it } from "vitest";
import { buildSystemLayout, placeShips, shipRenderState } from "./systemLayout";
import { computeBounds, computeFit } from "./viewport";

const wp = (symbol, type, x, y, orbits) => ({ symbol, type, x, y, orbits, traits: [] });

// SpaceTraders gives orbitals the exact same x/y as their parent — that
// co-location is the whole reason this layout exists.
const SYSTEM = [
  wp("X1-AA-P1", "PLANET", 0, 0),
  wp("X1-AA-M1", "MOON", 0, 0, "X1-AA-P1"),
  wp("X1-AA-M2", "MOON", 0, 0, "X1-AA-P1"),
  wp("X1-AA-A1", "ASTEROID", 40, 20),
];

function layoutOf(waypoints) {
  const fit = computeFit(computeBounds(waypoints), 400, 400, 40);
  return buildSystemLayout(waypoints, fit);
}

describe("buildSystemLayout", () => {
  it("places every waypoint exactly once", () => {
    const { nodes, index } = layoutOf(SYSTEM);
    expect(nodes).toHaveLength(SYSTEM.length);
    expect(index.size).toBe(SYSTEM.length);
  });

  it("fans co-located orbitals off their parent instead of stacking them", () => {
    const { index } = layoutOf(SYSTEM);
    const p = index.get("X1-AA-P1");
    const m1 = index.get("X1-AA-M1");
    const m2 = index.get("X1-AA-M2");

    expect(Math.hypot(m1.x - p.x, m1.y - p.y)).toBeGreaterThan(10);
    expect(Math.hypot(m2.x - p.x, m2.y - p.y)).toBeGreaterThan(10);
    // Two children sit opposite each other on the ring.
    expect(Math.hypot(m1.x - m2.x, m1.y - m2.y)).toBeCloseTo(
      2 * Math.hypot(m1.x - p.x, m1.y - p.y),
      6,
    );
  });

  it("marks orbitals and records the ring for its parent", () => {
    const { index, rings } = layoutOf(SYSTEM);
    expect(index.get("X1-AA-M1").isOrbital).toBe(true);
    expect(index.get("X1-AA-P1").isOrbital).toBe(false);
    expect(rings).toHaveLength(1);
    expect(rings[0].symbol).toBe("X1-AA-P1");
    expect(rings[0].childCount).toBe(2);
  });

  it("is deterministic across rebuilds and input ordering", () => {
    const a = layoutOf(SYSTEM);
    const b = layoutOf([...SYSTEM].reverse());
    for (const node of a.nodes) {
      expect(b.index.get(node.symbol).x).toBeCloseTo(node.x, 9);
      expect(b.index.get(node.symbol).y).toBeCloseTo(node.y, 9);
    }
  });

  it("does not hang or drop waypoints when `orbits` forms a cycle", () => {
    const cyclic = [wp("A", "MOON", 0, 0, "B"), wp("B", "MOON", 0, 0, "A")];
    const { nodes } = layoutOf(cyclic);
    expect(nodes.map((n) => n.symbol).sort()).toEqual(["A", "B"]);
  });

  // Regression: every close pair observed in the real X1-DT69 system was a
  // collision between two *different* families, because each ring was seeded
  // independently from hash(parent).
  it("aims each ring's widest gap at the nearest other body", () => {
    const pair = [
      wp("A-P1", "PLANET", 0, 0),
      wp("A-M1", "MOON", 0, 0, "A-P1"),
      wp("B-P1", "PLANET", 30, 0),
      wp("B-M1", "MOON", 30, 0, "B-P1"),
    ];
    const { index } = layoutOf(pair);
    const a = index.get("A-P1");
    const b = index.get("B-P1");
    const am = index.get("A-M1");
    const bm = index.get("B-M1");

    // Each lone moon should sit on the far side of its planet from the other.
    expect(Math.hypot(am.x - b.x, am.y - b.y)).toBeGreaterThan(Math.hypot(a.x - b.x, a.y - b.y));
    expect(Math.hypot(bm.x - a.x, bm.y - a.y)).toBeGreaterThan(Math.hypot(a.x - b.x, a.y - b.y));
    // …and therefore nowhere near each other.
    expect(Math.hypot(am.x - bm.x, am.y - bm.y)).toBeGreaterThan(Math.hypot(a.x - b.x, a.y - b.y));
  });

  it("keeps nested orbitals on the far side of their own parent", () => {
    const nested = [
      wp("N-P1", "PLANET", 0, 0),
      wp("N-M1", "MOON", 0, 0, "N-P1"),
      wp("N-S1", "ORBITAL_STATION", 0, 0, "N-M1"),
    ];
    const { index } = layoutOf(nested);
    const p = index.get("N-P1");
    const m = index.get("N-M1");
    const s = index.get("N-S1");
    expect(Math.hypot(s.x - p.x, s.y - p.y)).toBeGreaterThan(Math.hypot(m.x - p.x, m.y - p.y));
  });

  it("ignores an `orbits` pointing at a waypoint outside the system list", () => {
    const orphan = [wp("X1-AA-M9", "MOON", 3, 4, "X1-ZZ-P9")];
    const { nodes } = layoutOf(orphan);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].isOrbital).toBe(false);
  });
});

describe("shipRenderState", () => {
  const { index } = layoutOf(SYSTEM);

  it("resolves a docked ship to its own waypoint, not its parent body", () => {
    const moon = index.get("X1-AA-M1");
    const planet = index.get("X1-AA-P1");
    const pos = shipRenderState(
      { status: "DOCKED", waypointSymbol: "X1-AA-M1" },
      index,
      Date.now(),
    );
    expect(pos.x).toBeCloseTo(moon.x, 9);
    expect(pos.y).toBeCloseTo(moon.y, 9);
    expect(pos.x === planet.x && pos.y === planet.y).toBe(false);
  });

  it("interpolates a transit by symbol, ignoring the API's raw route coords", () => {
    const origin = index.get("X1-AA-P1");
    const dest = index.get("X1-AA-M1");
    const start = 1_000_000;
    const nav = {
      status: "IN_TRANSIT",
      route: {
        // Raw coords are identical here — a coordinate-based renderer would
        // draw this ship as motionless on top of the planet.
        origin: { symbol: "X1-AA-P1", x: 0, y: 0 },
        destination: { symbol: "X1-AA-M1", x: 0, y: 0 },
        departureTime: new Date(start).toISOString(),
        arrival: new Date(start + 1000).toISOString(),
      },
    };

    const mid = shipRenderState(nav, index, start + 500);
    expect(mid.x).toBeCloseTo((origin.x + dest.x) / 2, 6);
    expect(mid.y).toBeCloseTo((origin.y + dest.y) / 2, 6);

    expect(shipRenderState(nav, index, start - 5_000).x).toBeCloseTo(origin.x, 6);
    expect(shipRenderState(nav, index, start + 5_000).x).toBeCloseTo(dest.x, 6);
  });

  it("points the sprite along the route", () => {
    const nav = {
      status: "IN_TRANSIT",
      route: {
        origin: { symbol: "X1-AA-P1" },
        destination: { symbol: "X1-AA-A1" },
        departureTime: new Date(0).toISOString(),
        arrival: new Date(1000).toISOString(),
      },
    };
    const a = index.get("X1-AA-P1");
    const b = index.get("X1-AA-A1");
    const expected = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
    expect(shipRenderState(nav, index, 500).angle).toBeCloseTo(expected, 6);
  });

  it("returns null rather than NaN for a ship whose waypoint is unknown", () => {
    expect(shipRenderState({ status: "DOCKED", waypointSymbol: "X1-ZZ-Q1" }, index, 0)).toBeNull();
    expect(shipRenderState(null, index, 0)).toBeNull();
  });
});

describe("placeShips", () => {
  const { index } = layoutOf(SYSTEM);
  const idle = (symbol, at) => ({ symbol, nav: { status: "IN_ORBIT", waypointSymbol: at } });

  // Regression: ships rendered dead-centre on their waypoint left a planet with
  // three ships on it only 16% clickable, and stacked those ships on each other.
  it("parks idle ships clear of the body's own radius", () => {
    const body = index.get("X1-AA-P1");
    const [placed] = placeShips([idle("S1", "X1-AA-P1")], index, 0, { bodyRadius: () => 12 });
    expect(Math.hypot(placed.pos.x - body.x, placed.pos.y - body.y)).toBeGreaterThan(12);
  });

  // A constant park radius large enough for a gas giant would fling a moon's
  // ships onto its parent planet, so the radius follows the body.
  it("scales the park radius with the body it is parked at", () => {
    const body = index.get("X1-AA-P1");
    const distanceFor = (r) => {
      const [p] = placeShips([idle("S1", "X1-AA-P1")], index, 0, { bodyRadius: () => r });
      return Math.hypot(p.pos.x - body.x, p.pos.y - body.y);
    };
    expect(distanceFor(15)).toBeGreaterThan(distanceFor(6));
  });

  it("fans several ships at one body evenly instead of stacking them", () => {
    const ships = [idle("S1", "X1-AA-P1"), idle("S2", "X1-AA-P1"), idle("S3", "X1-AA-P1")];
    const placed = placeShips(ships, index, 0);
    expect(placed).toHaveLength(3);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const d = Math.hypot(placed[i].pos.x - placed[j].pos.x, placed[i].pos.y - placed[j].pos.y);
        expect(d).toBeGreaterThan(10);
      }
    }
  });

  it("keeps a ship's slot stable when the fleet list reorders", () => {
    const ships = [idle("S1", "X1-AA-P1"), idle("S2", "X1-AA-P1")];
    const forward = placeShips(ships, index, 0);
    const reversed = placeShips([...ships].reverse(), index, 0);
    for (const { ship, pos } of forward) {
      const other = reversed.find((p) => p.ship.symbol === ship.symbol);
      expect(other.pos.x).toBeCloseTo(pos.x, 9);
      expect(other.pos.y).toBeCloseTo(pos.y, 9);
    }
  });

  it("leaves in-transit ships on the line between waypoints", () => {
    const start = 1_000_000;
    const transiting = {
      symbol: "S9",
      nav: {
        status: "IN_TRANSIT",
        route: {
          origin: { symbol: "X1-AA-P1" },
          destination: { symbol: "X1-AA-A1" },
          departureTime: new Date(start).toISOString(),
          arrival: new Date(start + 1000).toISOString(),
        },
      },
    };
    const a = index.get("X1-AA-P1");
    const b = index.get("X1-AA-A1");
    const [placed] = placeShips([transiting], index, start + 500);
    expect(placed.pos.x).toBeCloseTo((a.x + b.x) / 2, 6);
    expect(placed.pos.y).toBeCloseTo((a.y + b.y) / 2, 6);
  });

  it("drops ships whose waypoint isn't in this system", () => {
    expect(placeShips([idle("S1", "X1-ZZ-Q9")], index, 0)).toEqual([]);
  });
});
