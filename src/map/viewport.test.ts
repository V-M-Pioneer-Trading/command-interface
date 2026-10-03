import { describe, expect, it } from "vitest";
import {
  MAX_SCALE,
  centerOn,
  clampPan,
  computeBounds,
  computeFit,
  iconScreenSize,
  panBy,
  project,
  zoomAt,
} from "./viewport";

const SIZE = { width: 400, height: 300 };

describe("computeFit", () => {
  it("fits to the tighter axis of a non-square container", () => {
    const fit = computeFit({ minX: -10, maxX: 10, minY: -10, maxY: 10 }, 400, 300, 50);
    // 300px of drawable width vs 200px of drawable height over a span of 20.
    expect(fit.k).toBe(10);
    expect(project(fit, 0, 0)).toEqual({ x: 200, y: 150 });
  });

  it("centres a degenerate system instead of dividing by zero", () => {
    const fit = computeFit({ minX: 5, maxX: 5, minY: 5, maxY: 5 }, 400, 300, 20);
    expect(Number.isFinite(fit.k)).toBe(true);
    expect(project(fit, 5, 5)).toEqual({ x: 200, y: 150 });
  });

  it("survives a container that has not been measured yet", () => {
    const fit = computeFit(computeBounds([]), 0, 0, 44);
    expect(Number.isFinite(fit.k)).toBe(true);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the cursor pinned", () => {
    const start = { scale: 1, tx: 0, ty: 0 };
    const cursor = { x: 100, y: 90 };
    const next = zoomAt(start, cursor.x, cursor.y, 2, SIZE.width, SIZE.height);

    const baseUnderCursor = {
      x: (cursor.x - start.tx) / start.scale,
      y: (cursor.y - start.ty) / start.scale,
    };
    expect(baseUnderCursor.x * next.scale + next.tx).toBeCloseTo(cursor.x, 6);
    expect(baseUnderCursor.y * next.scale + next.ty).toBeCloseTo(cursor.y, 6);
  });

  it("never exceeds the scale bounds", () => {
    let view = { scale: 1, tx: 0, ty: 0 };
    for (let i = 0; i < 50; i += 1) view = zoomAt(view, 10, 10, 2, SIZE.width, SIZE.height);
    expect(view.scale).toBe(MAX_SCALE);

    for (let i = 0; i < 50; i += 1) view = zoomAt(view, 10, 10, 0.5, SIZE.width, SIZE.height);
    expect(view.scale).toBe(1);
  });
});

describe("clampPan", () => {
  it("pins panning at fit-to-system zoom", () => {
    expect(clampPan(120, -80, 1, SIZE.width, SIZE.height)).toEqual({ tx: 0, ty: 0 });
  });

  it("keeps content covering the container when zoomed in", () => {
    expect(clampPan(50, 50, 2, SIZE.width, SIZE.height)).toEqual({ tx: 0, ty: 0 });
    expect(clampPan(-9999, -9999, 2, SIZE.width, SIZE.height)).toEqual({ tx: -400, ty: -300 });
  });

  it("is applied by panBy", () => {
    const view = panBy({ scale: 1, tx: 0, ty: 0 }, 100, 100, SIZE.width, SIZE.height);
    expect(view).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});

describe("centerOn", () => {
  it("moves a base-space point to the container centre", () => {
    const view = centerOn({ scale: 4, tx: 0, ty: 0 }, 60, 40, SIZE.width, SIZE.height);
    expect(60 * view.scale + view.tx).toBeCloseTo(SIZE.width / 2, 6);
    expect(40 * view.scale + view.ty).toBeCloseTo(SIZE.height / 2, 6);
  });

  it("still respects the pan clamp near an edge", () => {
    const view = centerOn({ scale: 2, tx: 0, ty: 0 }, 0, 0, SIZE.width, SIZE.height);
    expect(view.tx).toBe(0);
    expect(view.ty).toBe(0);
  });
});

describe("iconScreenSize", () => {
  it("grows sub-linearly so zoom separates crowded waypoints", () => {
    const base = 24;
    expect(iconScreenSize(base, 1)).toBe(base);
    expect(iconScreenSize(base, MAX_SCALE)).toBeGreaterThan(base);

    // The whole point: spacing scales linearly, icons don't, so the net
    // separation gain at max zoom is close to an order of magnitude.
    const iconGrowth = iconScreenSize(base, MAX_SCALE) / base;
    expect(iconGrowth).toBeLessThan(3);
    expect(MAX_SCALE / iconGrowth).toBeGreaterThan(10);
  });
});
