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

  it("gives every open panel a finite, unique offset", () => {
    const offsets = computeTogglePanelOffsets(new Set(PANEL_ORDER));
    expect(Object.values(offsets).every(Number.isFinite)).toBe(true);
    expect(new Set(Object.values(offsets)).size).toBe(PANEL_ORDER.length);
  });

  // The case the old title claimed and never covered. A key that is not in
  // PANEL_ORDER gets no offset at all — the panel would render
  // `right: undefinedrem`. This is the half of the layout invariant the module
  // can enforce; the other half, a PANEL_ORDER key with no PANEL_WIDTH_REM
  // entry falling back to DEFAULT_WIDTH_REM, is only reachable by editing the
  // module, so no test can reach it.
  it("gives a key outside PANEL_ORDER no offset at all", () => {
    expect(computeTogglePanelOffsets(new Set(["nonesuch"]))).toEqual({});
  });
});
