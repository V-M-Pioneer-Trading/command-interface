import { iconLocalSize, screenToLocal } from "../../../map/viewport";
import { waypointBaseSize, waypointSpriteId } from "../../../map/sprites/registry";
import { traitBadgeId } from "../../../map/sprites/ships";

const BADGE_SCREEN_SIZE = 7;
const BADGE_MIN_SCALE = 2;

/** Trait/status badges, corner-mounted, only once there's room to read them. */
function badgesFor(waypoint) {
  const traits = (waypoint.traits || []).map((t) => t.symbol);
  const out = [];
  if (traits.includes("MARKETPLACE")) out.push({ id: traitBadgeId("MARKETPLACE"), corner: [-1, 1] });
  if (traits.includes("SHIPYARD")) out.push({ id: traitBadgeId("SHIPYARD"), corner: [1, 1] });
  if (waypoint.isUnderConstruction) {
    out.push({ id: traitBadgeId("UNDER_CONSTRUCTION"), corner: [1, -1] });
  }
  return out.filter((b) => b.id);
}

export function WaypointLayer({ nodes, scale, selectedSymbol, onSelect, onHover }) {
  const showBadges = scale >= BADGE_MIN_SCALE;
  const badgeSize = screenToLocal(BADGE_SCREEN_SIZE, scale);

  return (
    <g className="lcars-map__waypoints">
      {nodes.map((node) => {
        const size = iconLocalSize(waypointBaseSize(node.type), scale);
        const half = size / 2;
        const hit = Math.max(size, screenToLocal(18, scale));
        const isSelected = node.symbol === selectedSymbol;

        return (
          <g
            key={node.symbol}
            className="lcars-map__waypoint"
            transform={`translate(${node.x}, ${node.y})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node);
            }}
            onPointerEnter={() => onHover(node.symbol)}
            onPointerLeave={() => onHover(null)}
          >
            {/* Transparent, generously sized so small asteroids stay clickable. */}
            <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
            {isSelected && (
              <circle
                className="lcars-map__waypoint-selection"
                r={half + screenToLocal(5, scale)}
                fill="none"
                strokeWidth={screenToLocal(1.25, scale)}
                strokeDasharray={`${screenToLocal(3, scale)} ${screenToLocal(2.5, scale)}`}
              />
            )}
            <use
              href={`#${waypointSpriteId(node.symbol, node.type)}`}
              x={-half}
              y={-half}
              width={size}
              height={size}
            />
            {showBadges &&
              badgesFor(node.waypoint).map((badge) => (
                <use
                  key={badge.id}
                  href={`#${badge.id}`}
                  x={badge.corner[0] * half - badgeSize / 2}
                  y={badge.corner[1] * half - badgeSize / 2}
                  width={badgeSize}
                  height={badgeSize}
                />
              ))}
          </g>
        );
      })}
    </g>
  );
}
