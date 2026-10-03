import type { LayoutNode } from "./systemLayout";

/**
 * Which ring (if any) the hovered waypoint should reveal.
 *
 * Hovering a parent shows its own ring; hovering one of its orbitals shows the
 * ring that orbital sits on — either way you get the "these belong together"
 * cue exactly when you're asking the question, without drawing rings the rest
 * of the time.
 */
export function activeRingSymbol(
  hoveredSymbol: string | null,
  index: ReadonlyMap<string, LayoutNode>,
): string | null {
  if (!hoveredSymbol) return null;
  const node = index.get(hoveredSymbol);
  if (!node) return null;
  const { parentSymbol } = node;
  if (parentSymbol) return parentSymbol;
  return node.symbol;
}
