/**
 * Pure viewport math for a pannable/zoomable 2D map.
 *
 * Deliberately knows nothing about systems, waypoints or ships — it only deals
 * in "world" coordinates (whatever a layout module emits), "base" coordinates
 * (world projected to fit the container at scale 1) and "screen" pixels. A
 * future sector map reuses this file unchanged and supplies its own layout.
 *
 *   base   = project(fit, worldX, worldY)
 *   screen = base * view.scale + (view.tx, view.ty)
 *
 * Render-side we keep the whole scene inside one `<g transform>` so panning
 * touches a single attribute, and counter-scale individual sizes with
 * `iconLocalSize` / `screenToLocal` instead of letting them ride the transform.
 */

export const MIN_SCALE = 1;
// A real 93-waypoint system compresses distinct bodies to ~1.7px apart at
// fit-to-system, which 8x could not pull past their own icon widths. 32x is
// what actually resolves the densest real clusters.
export const MAX_SCALE = 32;
// Sized so fit-to-system → max is ~13 notches rather than ~19.
export const ZOOM_STEP = 1.3;

/**
 * Icons grow with zoom, but sub-linearly: at MAX_SCALE (32x) spacing is 32x
 * wider while an icon is only 32^0.3 ≈ 2.8x bigger, so crowded waypoints
 * separate instead of scaling together — a net ~11x separation gain.
 */
export const ICON_ZOOM_EXPONENT = 0.3;

export const IDENTITY_VIEW = { scale: 1, tx: 0, ty: 0 };

export function computeBounds(points) {
  if (!points || points.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Fit `bounds` into a width x height container, preserving aspect ratio.
 * Returns the projection parameters consumed by `project`.
 */
export function computeFit(bounds, width, height, padding = 0) {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const pad = Math.min(padding, Math.min(w, h) / 2 - 1);
  const drawableW = Math.max(w - pad * 2, 1);
  const drawableH = Math.max(h - pad * 2, 1);

  if (!bounds) return { k: 1, cx: 0, cy: 0, width: w, height: h };

  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1);
  return {
    k: Math.min(drawableW / spanX, drawableH / spanY),
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
    width: w,
    height: h,
  };
}

/** World coordinates → base coordinates (container pixels at scale 1). */
export function project(fit, x, y) {
  return {
    x: fit.width / 2 + (x - fit.cx) * fit.k,
    y: fit.height / 2 + (y - fit.cy) * fit.k,
  };
}

export function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Keep the scaled content covering the container: at scale 1 there is nothing
 * to pan to, so both offsets pin to 0.
 */
export function clampPan(tx, ty, scale, width, height) {
  const minX = width * (1 - scale);
  const minY = height * (1 - scale);
  return {
    tx: Math.min(0, Math.max(minX, tx)),
    ty: Math.min(0, Math.max(minY, ty)),
  };
}

/** Zoom by `factor` keeping the point under (cx, cy) screen px fixed. */
export function zoomAt(view, cx, cy, factor, width, height) {
  const scale = clampScale(view.scale * factor);
  if (scale === view.scale) return view;
  const ratio = scale / view.scale;
  const { tx, ty } = clampPan(
    cx - (cx - view.tx) * ratio,
    cy - (cy - view.ty) * ratio,
    scale,
    width,
    height,
  );
  return { scale, tx, ty };
}

/** Zoom by `factor` about the container centre. */
export function zoomCentered(view, factor, width, height) {
  return zoomAt(view, width / 2, height / 2, factor, width, height);
}

export function panBy(view, dx, dy, width, height) {
  const { tx, ty } = clampPan(view.tx + dx, view.ty + dy, view.scale, width, height);
  return { ...view, tx, ty };
}

/** Pan so the given base-space point sits at the container centre. */
export function centerOn(view, baseX, baseY, width, height) {
  const { tx, ty } = clampPan(
    width / 2 - baseX * view.scale,
    height / 2 - baseY * view.scale,
    view.scale,
    width,
    height,
  );
  return { ...view, tx, ty };
}

/** On-screen size in px for an icon with the given base size at this zoom. */
export function iconScreenSize(baseSize, scale) {
  return baseSize * Math.pow(scale, ICON_ZOOM_EXPONENT);
}

/**
 * Size to emit inside the scaled `<g>` so the result measures `iconScreenSize`
 * px on screen.
 */
export function iconLocalSize(baseSize, scale) {
  return iconScreenSize(baseSize, scale) / scale;
}

/** Length inside the scaled `<g>` that renders as exactly `px` screen pixels. */
export function screenToLocal(px, scale) {
  return px / scale;
}
