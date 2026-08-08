import { screenToLocal } from "../../../map/viewport";

/**
 * Which ring (if any) the hovered waypoint should reveal.
 *
 * Hovering a parent shows its own ring; hovering one of its orbitals shows the
 * ring that orbital sits on — either way you get the "these belong together"
 * cue exactly when you're asking the question, without drawing rings the rest
 * of the time.
 */
export function activeRingSymbol(hoveredSymbol, index) {
  if (!hoveredSymbol) return null;
  const node = index.get(hoveredSymbol);
  if (!node) return null;
  return node.parentSymbol || node.symbol;
}

export function OrbitRingLayer({ rings, scale, activeSymbol }) {
  if (rings.length === 0) return null;

  return (
    <g className="lcars-map__orbit-rings">
      {rings.map((ring) => (
        <circle
          key={ring.symbol}
          className="lcars-map__orbit-ring"
          cx={ring.x}
          cy={ring.y}
          r={ring.r}
          fill="none"
          strokeWidth={screenToLocal(1, scale)}
          // Rendered always, faded rather than unmounted, so the ring can ease
          // in and out on hover instead of popping.
          opacity={ring.symbol === activeSymbol ? 0.55 : 0}
        />
      ))}
    </g>
  );
}
