import { screenToLocal } from "../../../map/viewport";

const FADE_START = 1.2;
const FADE_END = 2.6;
const MAX_OPACITY = 0.38;

/** Ring opacity ramps in as you zoom — invisible clutter at 1x, a clear
 *  parent/child cue once the orbitals have actually fanned apart. */
export function orbitRingOpacity(scale) {
  if (scale <= FADE_START) return 0;
  return Math.min(MAX_OPACITY, ((scale - FADE_START) / (FADE_END - FADE_START)) * MAX_OPACITY);
}

export function OrbitRingLayer({ rings, scale }) {
  const opacity = orbitRingOpacity(scale);
  if (opacity <= 0) return null;

  return (
    <g className="lcars-map__orbit-rings" opacity={opacity}>
      {rings.map((ring) => (
        <circle
          key={ring.symbol}
          cx={ring.x}
          cy={ring.y}
          r={ring.r}
          fill="none"
          stroke="var(--lcars-blue)"
          strokeWidth={screenToLocal(1, scale)}
        />
      ))}
    </g>
  );
}
