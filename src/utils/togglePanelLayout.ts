// Toggled panels (Contracts, Autopilot) can all be
// open at once — each is `position: absolute` with a computed `right` offset
// so they tile left-to-right instead of stacking on identical coordinates.
// Order and width here must match the panel components' own CSS widths.
const GAP_REM = 1;
export const PANEL_ORDER = ["contracts", "autopilot"] as const;
export type PanelKey = (typeof PANEL_ORDER)[number];

// Partial on purpose: the lookup below must cope with a key that has no width
// yet (see DEFAULT_WIDTH_REM), and the type should not claim otherwise.
const PANEL_WIDTH_REM: Partial<Record<PanelKey, number>> = {
  contracts: 22,
  autopilot: 22,
};
// Used if a panel key is opened without a matching PANEL_WIDTH_REM entry, so a
// missing width degrades to an overly generous offset instead of `NaN`/`undefined`
// silently breaking the `right` CSS value.
const DEFAULT_WIDTH_REM = 28;

/**
 * Given the set of currently-open panel keys, returns `{ [key]: rightOffsetRem }`
 * for just those keys — a panel not open takes no horizontal space, so a
 * single open panel always sits at the base offset regardless of how many
 * panel types exist in total.
 */
export function computeTogglePanelOffsets(
  openKeys: ReadonlySet<string>,
): Partial<Record<PanelKey, number>> {
  const offsets: Partial<Record<PanelKey, number>> = {};
  let cursor = GAP_REM;
  for (const key of PANEL_ORDER) {
    if (!openKeys.has(key)) continue;
    const width = PANEL_WIDTH_REM[key];
    if (width === undefined) {
      console.warn(`togglePanelLayout: no PANEL_WIDTH_REM entry for "${key}", using default`);
    }
    offsets[key] = cursor;
    cursor += (width ?? DEFAULT_WIDTH_REM) + GAP_REM;
  }
  return offsets;
}
