import { StrictMode, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMapViewport } from "./useMapViewport";

const plain = ({ children }: { children: ReactNode }) => <>{children}</>;
const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe("useMapViewport re-clamp on resize", () => {
  it.each([
    ["plain", plain],
    ["StrictMode", strict],
  ])("clamps a corner-panned view in the same commit as the shrink (%s)", (_name, wrapper) => {
    const { result, rerender } = renderHook(
      (size: { width: number; height: number }) => useMapViewport(size),
      { initialProps: { width: 1000, height: 800 }, wrapper },
    );

    act(() => { result.current.zoomBy(4); });
    // Pan to the bottom-right corner: the most negative offsets allowed at 4x.
    act(() => { result.current.centerOnPoint(1000, 800); });
    expect(result.current.view).toEqual({ scale: 4, tx: -3000, ty: -2400 });

    rerender({ width: 500, height: 400 });

    // The offsets must already be inside the new bounds (500 * (1 - 4), 400 * (1 - 4)),
    // with no committed render between the resize and the clamp.
    expect(result.current.view).toEqual({ scale: 4, tx: -1500, ty: -1200 });
  });
});
