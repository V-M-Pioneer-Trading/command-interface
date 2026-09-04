import { MAX_SCALE, MIN_SCALE } from "../../map/viewport";

/**
 * Zoom affordances for trackpads (where wheel-zoom is fiddly) and for
 * discoverability — the map also takes wheel, drag, and arrows/+/-/0 from the
 * keyboard. (Double-click zoom was removed: it swallowed the second click of
 * anyone double-clicking a waypoint.)
 */
export function MapControls({ scale, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="lcars-map__controls">
      <button
        type="button"
        className="lcars-map__control"
        onClick={onZoomIn}
        disabled={scale >= MAX_SCALE}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <span className="lcars-map__zoom-readout">{scale.toFixed(1)}x</span>
      <button
        type="button"
        className="lcars-map__control"
        onClick={onZoomOut}
        disabled={scale <= MIN_SCALE}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        className="lcars-map__control"
        onClick={onReset}
        disabled={scale === MIN_SCALE}
        title="Fit system"
        aria-label="Fit system"
      >
        ⌂
      </button>
    </div>
  );
}
