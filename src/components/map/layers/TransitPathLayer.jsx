import { screenToLocal } from "../../../map/viewport";

/**
 * Dashed line from where a ship left to where it's going. Endpoints come from
 * the layout index by symbol, not from route.origin/destination x/y — those
 * carry a moon's *parent* coordinates, which would draw the path to the wrong
 * body once orbitals are fanned onto a ring.
 */
export function TransitPathLayer({ transits, scale }) {
  if (transits.length === 0) return null;
  const stroke = screenToLocal(1.5, scale);

  return (
    <g className="lcars-map__transit-paths">
      {transits.map(({ key, from, to }) => (
        <line
          key={key}
          className="lcars-map__transit-path"
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeWidth={stroke}
          strokeDasharray={`${screenToLocal(4, scale)} ${screenToLocal(3, scale)}`}
        />
      ))}
    </g>
  );
}
