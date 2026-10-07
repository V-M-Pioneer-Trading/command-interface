import type { ReactNode } from "react";
import { useAgentQuery, useAutopilotStatusQuery } from "../../hooks/queries";
import { PANEL_ORDER, type PanelKey } from "../../utils/togglePanelLayout";
import type { Accent } from "../common/accent";
import { PillButton } from "../common/PillButton";
import { SystemStatus } from "./SystemStatus";
import { OperatorBadge } from "../operator/OperatorBadge";
import "./AgentBar.css";

// Keyed by the panel keys in utils/togglePanelLayout.ts, which is what decides
// where each open panel is drawn — a button here with no entry there would open
// a panel at an undefined offset.
const PANEL_BUTTONS: Record<PanelKey, { label: string; accent: Accent }> = {
  contracts: { label: "Contracts", accent: "lavender" },
  autopilot: { label: "Autopilot", accent: "orange" },
};

/** An unavailable stat reads as "—", never as a blank space that looks broken. */
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="lcars-agent-bar__stat">
      {label} <strong>{value ?? "—"}</strong>
    </span>
  );
}

export function AgentBar({
  contractCount,
  openPanels,
  onTogglePanel,
}: {
  contractCount: number;
  openPanels: Partial<Record<PanelKey, boolean>>;
  onTogglePanel: (key: PanelKey) => void;
}) {
  const { data: agent, isLoading } = useAgentQuery();
  const { data: autopilotStatus } = useAutopilotStatusQuery();

  // An anonymous visitor's agent query is disabled, not loading — react-query
  // reports isLoading false with no data, so keying the placeholder off
  // isLoading alone left the bar rendering four blank stats.
  const pending = isLoading ? "…" : null;

  return (
    <div className="lcars-agent-bar">
      <div className="lcars-agent-bar__elbow" />
      <div className="lcars-agent-bar__content">
        <span className="lcars-agent-bar__symbol">{pending ?? agent?.symbol ?? "NO AGENT"}</span>
        <Stat label="CREDITS" value={pending ?? agent?.credits.toLocaleString()} />
        <Stat label="FACTION" value={pending ?? agent?.startingFaction} />
        <Stat label="SHIPS" value={pending ?? agent?.shipCount} />
      </div>
      <div className="lcars-agent-bar__actions">        <OperatorBadge />
        <SystemStatus />
        {PANEL_ORDER.map((key) => {
          const { label, accent } = PANEL_BUTTONS[key];
          const isAutopilot = key === "autopilot";
          const status = isAutopilot ? autopilotStatus?.status : null;
          return (
            <PillButton
              key={key}
              accent={isAutopilot && status === "armed" ? "green" : accent}
              onClick={() => { onTogglePanel(key); }}
            >
              {label}
              {key === "contracts" && contractCount ? ` (${String(contractCount)})` : ""}
              {status ? ` (${status})` : ""}
              {openPanels[key] ? " ▲" : " ▼"}
            </PillButton>
          );
        })}
      </div>
    </div>
  );
}
