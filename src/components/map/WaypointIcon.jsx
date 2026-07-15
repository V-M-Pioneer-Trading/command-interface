const TYPE_STYLE = {
  PLANET: { shape: "circle", color: "var(--lcars-blue)", r: 10 },
  GAS_GIANT: { shape: "circle", color: "var(--lcars-violet)", r: 13 },
  MOON: { shape: "circle", color: "var(--lcars-tan)", r: 6 },
  ASTEROID_FIELD: { shape: "diamond", color: "var(--lcars-orange)", r: 8 },
  ASTEROID: { shape: "diamond", color: "var(--lcars-orange)", r: 6 },
  ASTEROID_BASE: { shape: "square", color: "var(--lcars-peach)", r: 8 },
  ORBITAL_STATION: { shape: "square", color: "var(--lcars-lavender)", r: 9 },
  JUMP_GATE: { shape: "ring", color: "var(--lcars-green)", r: 11 },
  FUEL_STATION: { shape: "square", color: "var(--lcars-yellow)", r: 7 },
};

const DEFAULT_STYLE = { shape: "circle", color: "var(--lcars-text-dim)", r: 7 };

export function WaypointIcon({ waypoint, onClick }) {
  const style = TYPE_STYLE[waypoint.type] || DEFAULT_STYLE;
  const { x, y } = waypoint;

  return (
    <g
      className="lcars-waypoint-icon"
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(waypoint);
      }}
    >
      {style.shape === "diamond" && (
        <rect
          width={style.r * 1.4}
          height={style.r * 1.4}
          x={-style.r * 0.7}
          y={-style.r * 0.7}
          transform="rotate(45)"
          fill={style.color}
        />
      )}
      {style.shape === "square" && (
        <rect
          width={style.r * 1.6}
          height={style.r * 1.6}
          x={-style.r * 0.8}
          y={-style.r * 0.8}
          fill={style.color}
        />
      )}
      {style.shape === "ring" && (
        <circle r={style.r} fill="none" stroke={style.color} strokeWidth={3} />
      )}
      {style.shape === "circle" && <circle r={style.r} fill={style.color} />}
      <text className="lcars-waypoint-icon__label" x={0} y={style.r + 12}>
        {waypoint.symbol.split("-").pop()}
      </text>
    </g>
  );
}
