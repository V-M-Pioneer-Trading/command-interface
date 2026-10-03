import { MAJOR_TYPES } from "./sprites/registry";

const ALL_LABELS_FROM_SCALE = 2;

/**
 * Below 2x only major bodies are labelled — 100 waypoints' worth of symbols at
 * fit-to-system zoom is unreadable soup. Whatever is hovered or selected is
 * always labelled regardless of zoom.
 */
export function isLabelVisible(
  node: { symbol: string; type: string },
  scale: number,
  { hovered, selected }: { hovered: string | null; selected: string | null },
): boolean {
  if (node.symbol === hovered || node.symbol === selected) return true;
  return scale >= ALL_LABELS_FROM_SCALE || MAJOR_TYPES.has(node.type);
}
