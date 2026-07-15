import { useShipRenderPosition } from "../../hooks/useShipRenderPosition";

const STATUS_COLOR = {
  DOCKED: "var(--status-docked)",
  IN_ORBIT: "var(--status-in-orbit)",
  IN_TRANSIT: "var(--status-in-transit)",
};

export function ShipMarker({ ship, isSelected, onClick }) {
  const pos = useShipRenderPosition(ship.nav);
  if (!pos) return null;

  const color = STATUS_COLOR[ship.nav?.status] || "var(--lcars-text-dim)";

  return (
    <g
      className="lcars-ship-marker"
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(ship.symbol);
      }}
    >
      {isSelected && (
        <circle r={14} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
      )}
      <polygon points="0,-9 8,7 -8,7" fill={color} stroke="#000" strokeWidth={1} />
      <text className="lcars-ship-marker__label" x={0} y={-14}>
        {ship.symbol.split("-").pop()}
      </text>
    </g>
  );
}
