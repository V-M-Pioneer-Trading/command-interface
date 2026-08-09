import { iconLocalSize, screenToLocal } from "../../../map/viewport";
import { SHIP_FAMILY_SIZE, roleBadgeId, shipFamily } from "../../../map/sprites/ships";

const STATUS_COLOR = {
  DOCKED: "var(--status-docked)",
  IN_ORBIT: "var(--status-in-orbit)",
  IN_TRANSIT: "var(--status-in-transit)",
};

const ROLE_BADGE_MIN_SCALE = 2;
const ROLE_BADGE_SCREEN_SIZE = 7;

/**
 * Hull tones inside the sprite are `currentColor`, so setting `color` here
 * tints the whole ship by nav status while the outline and engine glow stay put.
 */
export function ShipLayer({ ships, scale, selectedSymbol, onSelect, onBadgeHover }) {
  const showRole = scale >= ROLE_BADGE_MIN_SCALE;
  const badgeSize = screenToLocal(ROLE_BADGE_SCREEN_SIZE, scale);

  return (
    <g className="lcars-map__ships">
      {ships.map(({ ship, pos }) => {
        const family = shipFamily(ship.frame?.symbol);
        const size = iconLocalSize(SHIP_FAMILY_SIZE[family], scale);
        const half = size / 2;
        const color = STATUS_COLOR[ship.nav?.status] || "var(--lcars-text-dim)";
        const isSelected = ship.symbol === selectedSymbol;
        const badge = showRole ? roleBadgeId(ship.registration?.role) : null;

        return (
          <g
            key={ship.symbol}
            className="lcars-map__ship"
            transform={`translate(${pos.x}, ${pos.y})`}
            style={{ color }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(ship.symbol, pos);
            }}
          >
            {/* Sprite-sized, with a floor so a probe stays catchable. No margin
                beyond that: ships park close to the body they orbit, so padding
                here goes straight back to covering it — which is what made
                bodies unclickable in the first place. */}
            <circle r={Math.max(half, screenToLocal(8, scale))} fill="transparent" />
            {isSelected && (
              <circle
                className="lcars-map__ship-selection"
                r={half + screenToLocal(5, scale)}
                fill="none"
                stroke={color}
                strokeWidth={screenToLocal(1.25, scale)}
                strokeDasharray={`${screenToLocal(3, scale)} ${screenToLocal(2, scale)}`}
              />
            )}
            <g transform={`rotate(${pos.angle})`}>
              <use href={`#ship-${family}`} x={-half} y={-half} width={size} height={size} />
            </g>
            {badge && (
              <use
                className="lcars-map__badge"
                href={`#${badge}`}
                x={half - badgeSize / 2}
                y={-half - badgeSize / 2}
                width={badgeSize}
                height={badgeSize}
                onPointerEnter={() =>
                  onBadgeHover({ id: badge, x: pos.x + half, y: pos.y - half })
                }
                onPointerLeave={() => onBadgeHover(null)}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
