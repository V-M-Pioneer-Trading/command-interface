import { describe, expect, it } from "vitest";
import { PANEL_ORDER, computeTogglePanelOffsets } from "./togglePanelLayout";

describe("computeTogglePanelOffsets", () => {
  it("puts a single open panel at the base offset whichever one it is", () => {
    for (const key of PANEL_ORDER) {
      expect(computeTogglePanelOffsets(new Set([key]))).toEqual({ [key]: 1 });
    }
  });

  it("tiles open panels leftwards in PANEL_ORDER, skipping closed ones", () => {
    const offsets = computeTogglePanelOffsets(new Set(["contracts", "knobs"]));
    expect(offsets.contracts).toBe(1);
    // 1rem gap + contracts' own 22rem + 1rem gap.
    expect(offsets.knobs).toBe(24);
    expect(offsets.autopilot).toBeUndefined();
  });

  it("gives every open panel a finite offset, even an unknown key", () => {
    const offsets = computeTogglePanelOffsets(new Set(PANEL_ORDER));
    expect(Object.values(offsets).every(Number.isFinite)).toBe(true);
    expect(new Set(Object.values(offsets)).size).toBe(PANEL_ORDER.length);
  });
});
