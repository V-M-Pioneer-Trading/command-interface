import { iconLocalSize, screenToLocal } from "../../../map/viewport";
import { MAJOR_TYPES, waypointBaseSize } from "../../../map/sprites/registry";
import { SHIP_FAMILY_SIZE, shipFamily } from "../../../map/sprites/ships";

const ALL_LABELS_FROM_SCALE = 2;
const LABEL_FONT_PX = 10;
const LABEL_GAP_PX = 4;

/**
 * Below 2x only major bodies are labelled — 100 waypoints' worth of symbols at
 * fit-to-system zoom is unreadable soup. Whatever is hovered or selected is
 * always labelled regardless of zoom.
 */
export function isLabelVisible(node, scale, { hovered, selected }) {
  if (node.symbol === hovered || node.symbol === selected) return true;
  return scale >= ALL_LABELS_FROM_SCALE || MAJOR_TYPES.has(node.type);
}

function shortName(symbol) {
  return symbol.split("-").pop();
}

/**
 * Drawn after every icon layer so labels always land on top, and at a
 * counter-scaled font size so text stays 10px on screen at any zoom.
 */
export function LabelLayer({ nodes, ships, scale, hovered, selectedWaypoint, selectedShip }) {
  const fontSize = screenToLocal(LABEL_FONT_PX, scale);
  const gap = screenToLocal(LABEL_GAP_PX, scale);

  return (
    <g className="lcars-map__labels" fontSize={fontSize}>
      {nodes
        .filter((node) => isLabelVisible(node, scale, { hovered, selected: selectedWaypoint }))
        .map((node) => (
          <text
            key={node.symbol}
            className="lcars-map__waypoint-label"
            x={node.x}
            y={node.y + iconLocalSize(waypointBaseSize(node.type), scale) / 2 + gap + fontSize}
          >
            {shortName(node.symbol)}
          </text>
        ))}
      {ships.map(({ ship, pos }) => (
        <text
          key={ship.symbol}
          className={`lcars-map__ship-label${ship.symbol === selectedShip ? " is-selected" : ""}`}
          x={pos.x}
          y={pos.y - iconLocalSize(SHIP_FAMILY_SIZE[shipFamily(ship.frame?.symbol)], scale) / 2 - gap}
        >
          {shortName(ship.symbol)}
        </text>
      ))}
    </g>
  );
}
