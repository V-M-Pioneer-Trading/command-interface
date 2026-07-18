import { useMemo, useState } from "react";
import "./CreditsPerHourChart.css";

const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 160;
const PADDING = { top: 12, right: 12, bottom: 20, left: 44 };

function formatCredits(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Single-series line chart (meta#17) — no legend needed (one series; the
 * panel title already names it). 2px line, end-dot with a surface-color ring,
 * hairline recessive gridlines, a crosshair+tooltip that snaps to the nearest
 * rollup. Every value it shows is also listed as plain text below the chart,
 * so nothing is hover-only.
 */
export function CreditsPerHourChart({ rollups }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // Rollups arrive newest-first from the API; the chart reads left-to-right
  // chronologically.
  const chronological = useMemo(() => [...(rollups || [])].reverse(), [rollups]);

  const plot = useMemo(() => {
    const drawWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const drawHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
    if (chronological.length === 0) return null;

    const values = chronological.map((r) => r.creditsPerHour);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const span = maxValue - minValue || 1;

    const points = chronological.map((r, i) => ({
      x:
        PADDING.left +
        (chronological.length === 1 ? drawWidth / 2 : (i / (chronological.length - 1)) * drawWidth),
      y: PADDING.top + drawHeight - ((r.creditsPerHour - minValue) / span) * drawHeight,
      rollup: r,
    }));

    const zeroY = PADDING.top + drawHeight - ((0 - minValue) / span) * drawHeight;

    return { points, maxValue, minValue, zeroY, drawWidth, drawHeight };
  }, [chronological]);

  if (!rollups || rollups.length === 0) {
    return <div className="lcars-credits-chart__empty">No rollups yet</div>;
  }

  const linePath = plot.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const hovered = hoverIndex !== null ? plot.points[hoverIndex] : null;

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    plot.points.forEach((p, i) => {
      const dist = Math.abs(p.x - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <div className="lcars-credits-chart">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="lcars-credits-chart__svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Recessive gridlines at max/zero/min */}
        <line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={PADDING.top} y2={PADDING.top} className="lcars-credits-chart__gridline" />
        <line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={plot.zeroY} y2={plot.zeroY} className="lcars-credits-chart__gridline" />
        <line
          x1={PADDING.left}
          x2={VIEW_WIDTH - PADDING.right}
          y1={PADDING.top + plot.drawHeight}
          y2={PADDING.top + plot.drawHeight}
          className="lcars-credits-chart__gridline"
        />
        <text x={4} y={PADDING.top + 4} className="lcars-credits-chart__axis-label">
          {formatCredits(plot.maxValue)}
        </text>
        <text x={4} y={PADDING.top + plot.drawHeight + 4} className="lcars-credits-chart__axis-label">
          {formatCredits(plot.minValue)}
        </text>

        <path d={linePath} className="lcars-credits-chart__line" fill="none" />

        {/* End-dot with surface-color ring, direct-labeled with its value */}
        {plot.points.length > 0 && (
          <>
            <circle
              cx={plot.points[plot.points.length - 1].x}
              cy={plot.points[plot.points.length - 1].y}
              r={5}
              className="lcars-credits-chart__end-dot"
            />
            <text
              x={plot.points[plot.points.length - 1].x - 4}
              y={plot.points[plot.points.length - 1].y - 10}
              textAnchor="end"
              className="lcars-credits-chart__end-label"
            >
              {formatCredits(plot.points[plot.points.length - 1].rollup.creditsPerHour)}
            </text>
          </>
        )}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PADDING.top}
            y2={PADDING.top + plot.drawHeight}
            className="lcars-credits-chart__crosshair"
          />
        )}
        {hovered && <circle cx={hovered.x} cy={hovered.y} r={5} className="lcars-credits-chart__hover-dot" />}
      </svg>
      {hovered && (
        <div className="lcars-credits-chart__tooltip" style={{ left: `${(hovered.x / VIEW_WIDTH) * 100}%` }}>
          <strong>{formatCredits(hovered.rollup.creditsPerHour)}/hr</strong>
          <span>{formatTime(hovered.rollup.windowEnd)}</span>
        </div>
      )}
      <ul className="lcars-credits-chart__table">
        {/* Every point the chart plots is listed here too — the hover
            tooltip enhances, it never gates access to a value. */}
        {chronological.map((r) => (
          <li key={r.windowEnd}>
            <span>{formatTime(r.windowEnd)}</span>
            <span>{formatCredits(r.creditsPerHour)}/hr</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
