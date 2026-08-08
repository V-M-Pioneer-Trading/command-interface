import { describe, expect, it } from "vitest";
import { buildSystemLayout, shipRenderState } from "./systemLayout";
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
