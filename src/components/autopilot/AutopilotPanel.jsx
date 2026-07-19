import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useAlerts } from "../../context/AlertContext";
import { useAutopilotStatusQuery } from "../../hooks/queries";
import { automationService } from "../../api/automationService";
import { PillButton } from "../common/PillButton";
import "./AutopilotPanel.css";

export function AutopilotPanel({ onClose, style }) {
  const { token: sessionToken } = useAuth();
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useAutopilotStatusQuery();

  // Prefilled from the operator's already-pasted SpaceTraders token, but
  // editable — automation-service holds its own copy in memory, independent
  // of this app's own session token, and never persists it beyond that.
  const [armToken, setArmToken] = useState(sessionToken || "");
  const [mode, setMode] = useState("live");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["autopilotStatus"] });

  const armMutation = useMutation({
    mutationFn: () => automationService.arm(armToken, mode),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to arm autopilot"),
  });
  const pauseMutation = useMutation({
    mutationFn: () => automationService.pause(),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to pause autopilot"),
  });
  const abortMutation = useMutation({
    mutationFn: () => automationService.abort(),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to abort autopilot"),
  });

  const busy = armMutation.isPending || pauseMutation.isPending || abortMutation.isPending;
  const currentStatus = status?.status;
  // Arming (or re-arming, to switch live<->shadow or replace the held token)
  // is allowed from any status per automation-service's AutopilotState — only
  // pause/abort are gated by the current status.
  const canPause = currentStatus === "armed";
  const canAbort = currentStatus === "armed" || currentStatus === "paused";

  return (
    <div className="lcars-autopilot-panel" style={style}>
      <div className="lcars-autopilot-panel__header">
        <h2>Autopilot</h2>
        <button type="button" onClick={onClose} className="lcars-autopilot-panel__close">
          ×
        </button>
      </div>

      <div className="lcars-autopilot-panel__status">
        <span className="lcars-autopilot-panel__status-label">STATUS</span>
        <span className={`lcars-autopilot-panel__status-value status-${currentStatus || "unknown"}`}>
          {isLoading ? "..." : currentStatus?.toUpperCase() || "UNKNOWN"}
        </span>
        {status?.mode && (
          <span className={`lcars-autopilot-panel__mode-value mode-${status.mode}`}>
            {status.mode.toUpperCase()}
          </span>
        )}
      </div>

      <form
        className="lcars-autopilot-panel__arm-form"
        onSubmit={(e) => {
          e.preventDefault();
          armMutation.mutate();
        }}
      >
        <input
          type="password"
          value={armToken}
          onChange={(e) => setArmToken(e.target.value)}
          placeholder="SpaceTraders token"
          className="lcars-autopilot-panel__token-input"
          disabled={busy}
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={busy}
          className="lcars-autopilot-panel__mode-select"
        >
          <option value="live">Live</option>
          <option value="shadow">Shadow</option>
        </select>
        <PillButton type="submit" accent="green" disabled={busy || !armToken}>
          Arm
        </PillButton>
      </form>

      <div className="lcars-autopilot-panel__actions">
        <PillButton accent="yellow" disabled={!canPause || busy} onClick={() => pauseMutation.mutate()}>
          Pause
        </PillButton>
        <PillButton accent="red" disabled={!canAbort || busy} onClick={() => abortMutation.mutate()}>
          Abort
        </PillButton>
      </div>
    </div>
  );
}
