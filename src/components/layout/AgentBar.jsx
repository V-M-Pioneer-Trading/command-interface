import { useAgentQuery } from "../../hooks/queries";
import { useAuth } from "../../context/AuthContext";
import { PillButton } from "../common/PillButton";
import "./AgentBar.css";

export function AgentBar({ contractCount, onToggleContracts, contractsOpen }) {
  const { token, logout } = useAuth();
  const { data: agent, isLoading } = useAgentQuery(token);

  return (
    <div className="lcars-agent-bar">
      <div className="lcars-agent-bar__elbow" />
      <div className="lcars-agent-bar__content">
        <span className="lcars-agent-bar__symbol">
          {isLoading ? "..." : agent?.symbol}
        </span>
        <span className="lcars-agent-bar__stat">
          CREDITS <strong>{isLoading ? "..." : agent?.credits?.toLocaleString()}</strong>
        </span>
        <span className="lcars-agent-bar__stat">
          FACTION <strong>{isLoading ? "..." : agent?.startingFaction}</strong>
        </span>
        <span className="lcars-agent-bar__stat">
          SHIPS <strong>{isLoading ? "..." : agent?.shipCount}</strong>
        </span>
      </div>
      <div className="lcars-agent-bar__actions">
        <PillButton accent="lavender" onClick={onToggleContracts}>
          Contracts{contractCount ? ` (${contractCount})` : ""}
          {contractsOpen ? " ▲" : " ▼"}
        </PillButton>
        <PillButton accent="red" onClick={logout}>
          Disconnect
        </PillButton>
      </div>
    </div>
  );
}
