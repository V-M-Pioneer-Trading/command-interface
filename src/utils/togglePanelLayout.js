// Toggled panels (Contracts, Autopilot, Observability, Knobs, ...) can all be
// open at once — each is `position: absolute` with a computed `right` offset
// so they tile left-to-right instead of stacking on identical coordinates.
// Order and width here must match the panel components' own CSS widths.
const GAP_REM = 1;
export const PANEL_ORDER = ["contracts", "autopilot", "observability", "knobs"];
const PANEL_WIDTH_REM = {
  contracts: 22,
  autopilot: 22,
  observability: 28,
  knobs: 24,
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
export function computeTogglePanelOffsets(openKeys) {
  const offsets = {};
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
