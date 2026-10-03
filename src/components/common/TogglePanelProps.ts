import type { CSSProperties } from "react";

/** What `Dashboard` hands every toggled overlay panel: how to close it, and where it sits. */
export interface TogglePanelProps {
  onClose: () => void;
  style?: CSSProperties;
}
