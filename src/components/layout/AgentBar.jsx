import { useAgentQuery, useAutopilotStatusQuery } from "../../hooks/queries";
import { PANEL_ORDER } from "../../utils/togglePanelLayout";
import { PillButton } from "../common/PillButton";
import { SystemStatus } from "./SystemStatus";
import { OperatorBadge } from "../operator/OperatorBadge";
import { GameTokenBadge } from "../gameToken/GameTokenBadge";
import "./AgentBar.css";

// Keyed by the panel keys in utils/togglePanelLayout.js, which is what decides
// where each open panel is drawn — a button here with no entry there would open
// a panel at an undefined offset.
const PANEL_BUTTONS = {
  contracts: { label: "Contracts", accent: "lavender" },
  autopilot: { label: "Autopilot", accent: "orange" },
  observability: { label: "Observability", accent: "blue" },
  knobs: { label: "Knobs", accent: "tan" },
};

/** An unavailable stat reads as "—", never as a blank space that looks broken. */
function Stat({ label, value }) {
  return (
    <span className="lcars-agent-bar__stat">
      {label} <strong>{value ?? "—"}</strong>
    </span>
  );
}

export function AgentBar({ contractCount, openPanels, onTogglePanel }) {
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
        <Stat label="CREDITS" value={pending ?? agent?.credits?.toLocaleString()} />
        <Stat label="FACTION" value={pending ?? agent?.startingFaction} />
        <Stat label="SHIPS" value={pending ?? agent?.shipCount} />
      </div>
      <div className="lcars-agent-bar__actions">
        <GameTokenBadge />
        <OperatorBadge />
        <SystemStatus />
        {PANEL_ORDER.map((key) => {
          const { label, accent } = PANEL_BUTTONS[key];
          const isAutopilot = key === "autopilot";
          const status = isAutopilot ? autopilotStatus?.status : null;
          return (
            <PillButton
              key={key}
              accent={isAutopilot && status === "armed" ? "green" : accent}
              onClick={() => onTogglePanel(key)}
            >
              {label}
              {key === "contracts" && contractCount ? ` (${contractCount})` : ""}
              {status ? ` (${status})` : ""}
              {openPanels[key] ? " ▲" : " ▼"}
            </PillButton>
          );
        })}
      </div>
    </div>
  );
}
