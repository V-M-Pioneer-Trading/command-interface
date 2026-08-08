import { project } from "./viewport";

/**
 * Turns a system's waypoint list into positioned nodes.
 *
 * The interesting part: SpaceTraders gives orbitals (moons, orbital stations,
 * jump gates, fuel stations that `orbits` a body) the *exact same* x/y as their
 * parent. No amount of zoom separates them, so we fan them out onto a ring
 * around the parent. Ring radius is expressed in base coordinates, which means
 * it rides the zoom transform linearly while icons only grow by scale^0.3 —
 * zooming in genuinely spreads a cluster apart.
 */

const RING_BASE_RADIUS = 19;
const RING_RADIUS_PER_EXTRA_CHILD = 3.5;
const RING_DEPTH_FALLOFF = 0.55;

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable per-symbol starting angle so a ring never reshuffles between renders. */
export function seededAngle(symbol) {
  return (hashString(symbol) / 0xffffffff) * Math.PI * 2;
}

/**
 * Where to start laying children out on a ring.
 *
 * Rings used to be seeded purely from hash(parent), independently per parent.
 * In a dense real system that put a moon of one planet straight on top of a
 * station of the neighbouring planet — every close pair observed in X1-DT69 was
 * a collision between two *different* families, never within one ring.
 *
 * So: aim the widest gap in the ring at whatever is nearest. With `count`
 * children spaced `2pi/count` apart, offsetting the start by half a step puts
 * the crowded direction exactly between two children, which is the most
 * clearance available. Falls back to the hash when there is no neighbour.
 */
export function ringStartAngle(symbol, count, neighbourAngle) {
  const step = (Math.PI * 2) / count;
  if (neighbourAngle === null) return seededAngle(symbol);
  return neighbourAngle + step / 2;
}

function ringRadius(childCount, depth) {
  const extra = Math.max(0, childCount - 3) * RING_RADIUS_PER_EXTRA_CHILD;
  return (RING_BASE_RADIUS + extra) * Math.pow(RING_DEPTH_FALLOFF, depth);
}

/**
 * @param waypoints raw SpaceTraders waypoints (needs symbol, type, x, y, orbits)
 * @param fit       projection from `computeFit`
 * @returns { nodes, index, rings, bounds } — nodes carry base-space x/y
 */
export function buildSystemLayout(waypoints, fit) {
  const list = Array.isArray(waypoints) ? waypoints : [];
  const bySymbol = new Map(list.map((w) => [w.symbol, w]));

  const childrenOf = new Map();
  const roots = [];
  for (const w of list) {
    const parent = w.orbits && w.orbits !== w.symbol ? w.orbits : null;
    if (parent && bySymbol.has(parent)) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(w);
    } else {
      roots.push(w);
    }
  }
  // Deterministic ordering — the API's list order is not guaranteed stable.
  childrenOf.forEach((kids) => kids.sort((a, b) => a.symbol.localeCompare(b.symbol)));

  const nodes = [];
  const rings = [];
  const index = new Map();
  const visited = new Set();

  // Direction from a root toward the nearest other root — the direction its
  // orbitals most need to avoid. Roots are what's pinned in space, so this is
  // stable and needs computing only once per parent.
  function nearestRootAngle(x, y, selfSymbol) {
    let best = null;
    let bestDist = Infinity;
    for (const other of rootPositions) {
      if (other.symbol === selfSymbol) continue;
      const d = Math.hypot(other.x - x, other.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return best ? Math.atan2(best.y - y, best.x - x) : null;
  }

  function place(waypoint, x, y, depth, parentSymbol, parentX, parentY) {
    // `orbits` is server data; a cycle would otherwise recurse forever.
    if (visited.has(waypoint.symbol)) return;
    visited.add(waypoint.symbol);

    const node = {
      symbol: waypoint.symbol,
      type: waypoint.type,
      x,
      y,
      depth,
      parentSymbol,
      isOrbital: depth > 0,
      waypoint,
    };
    nodes.push(node);
    index.set(node.symbol, node);

    const kids = childrenOf.get(waypoint.symbol) || [];
    if (kids.length === 0) return;

    const radius = ringRadius(kids.length, depth);
    rings.push({ symbol: waypoint.symbol, x, y, r: radius, childCount: kids.length });

    // Nested orbitals aim away from their own parent; roots aim away from the
    // nearest other root.
    const crowdedAngle =
      depth > 0 && parentX !== undefined
        ? Math.atan2(parentY - y, parentX - x)
        : nearestRootAngle(x, y, waypoint.symbol);
    const start = ringStartAngle(waypoint.symbol, kids.length, crowdedAngle);
    const step = (Math.PI * 2) / kids.length;
    kids.forEach((kid, i) => {
      const angle = start + i * step;
      place(
        kid,
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        depth + 1,
        waypoint.symbol,
        x,
        y,
      );
    });
  }

  roots.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const rootPositions = roots.map((root) => {
    const p = project(fit, root.x, root.y);
    return { symbol: root.symbol, x: p.x, y: p.y };
  });

  for (const root of rootPositions) {
    place(bySymbol.get(root.symbol), root.x, root.y, 0, null);
  }

  // A cycle among orbitals would leave members unplaced — drop them at their
  // raw position rather than silently losing waypoints off the map.
  for (const w of list) {
    if (visited.has(w.symbol)) continue;
    const p = project(fit, w.x, w.y);
    place(w, p.x, p.y, 0, null);
  }

  return { nodes, index, rings };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Where to draw a ship, in base coordinates.
 *
 * Route origin/destination carry the API's raw x/y, which for an orbital is the
 * *parent's* position — so a ship bound for a moon would visibly fly to the
 * planet. Everything resolves through the layout index by symbol instead.
 *
 * @returns { x, y, angle } | null — angle in degrees, 0 = sprite's own "up"
 */
export function shipRenderState(nav, index, now) {
  if (!nav) return null;

  const destSymbol = nav.route?.destination?.symbol || nav.waypointSymbol;
  const dest = destSymbol ? index.get(destSymbol) : null;

  if (nav.status !== "IN_TRANSIT" || !nav.route) {
    return dest ? { x: dest.x, y: dest.y, angle: 0 } : null;
  }

  const origin = index.get(nav.route.origin?.symbol);
  if (!origin || !dest) return dest ? { x: dest.x, y: dest.y, angle: 0 } : null;

  const start = new Date(nav.route.departureTime).getTime();
  const end = new Date(nav.route.arrival).getTime();
  const t = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;

  const dx = dest.x - origin.x;
  const dy = dest.y - origin.y;
  return {
    x: lerp(origin.x, dest.x, t),
    y: lerp(origin.y, dest.y, t),
    // Sprites are drawn nose-up; atan2 gives 0deg pointing +x, hence the +90.
    angle: dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI + 90,
  };
}
