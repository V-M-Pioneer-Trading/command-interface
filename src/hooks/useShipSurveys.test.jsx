import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useShipSurveys } from "./useShipSurveys";

const survey = (signature) => ({ signature, size: "SMALL", deposits: [] });

describe("useShipSurveys", () => {
  it("accumulates surveys found by the same ship", () => {
    const { result } = renderHook(() => useShipSurveys("SHIP-A"));

    act(() => result.current.addSurveys([survey("A1")]));
    act(() => result.current.addSurveys([survey("A2")]));

    expect(result.current.surveys.map((s) => s.signature)).toEqual(["A1", "A2"]);
  });

  // Regression: the panel held one bare `surveys` array that was never keyed to
  // a ship. Selecting a second ship kept showing the first ship's surveys, and
  // the Extract button on one of them posted that ship's signature against the
  // newly selected ship.
  it("reports no surveys for a ship that has not surveyed", () => {
    const { result, rerender } = renderHook(({ symbol }) => useShipSurveys(symbol), {
      initialProps: { symbol: "SHIP-A" },
    });

    act(() => result.current.addSurveys([survey("A1")]));
    expect(result.current.surveys).toHaveLength(1);

    rerender({ symbol: "SHIP-B" });
    expect(result.current.surveys).toEqual([]);
  });

  // …and a second ship's own survey replaces the first's rather than joining it.
  it("does not merge two ships' surveys into one list", () => {
    const { result, rerender } = renderHook(({ symbol }) => useShipSurveys(symbol), {
      initialProps: { symbol: "SHIP-A" },
    });

    act(() => result.current.addSurveys([survey("A1")]));
    rerender({ symbol: "SHIP-B" });
    act(() => result.current.addSurveys([survey("B1")]));

    expect(result.current.surveys.map((s) => s.signature)).toEqual(["B1"]);
  });
})
