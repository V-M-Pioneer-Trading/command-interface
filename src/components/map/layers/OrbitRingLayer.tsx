import type { OrbitRing } from "../../../map/systemLayout";
import { screenToLocal } from "../../../map/viewport";

export function OrbitRingLayer({
  rings,
  scale,
  activeSymbol,
}: {
  rings: OrbitRing[];
  scale: number;
  activeSymbol: string | null;
}) {
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
