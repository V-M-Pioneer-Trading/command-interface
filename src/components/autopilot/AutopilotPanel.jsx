import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../../context/AlertContext";
import { useAutopilotStatusQuery } from "../../hooks/queries";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../hooks/useOperator";
import { automationService } from "../../api/automationService";
import { PillButton } from "../common/PillButton";
import "./AutopilotPanel.css";

export function AutopilotPanel({ onClose, style }) {
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useAutopilotStatusQuery();
  const { isSignedIn, can, getToken } = useOperator();

  // Rendered disabled rather than hidden. A visitor should be able to see that
  // an arm/abort surface exists and is gated — hiding it makes the system look
  // less capable than it is, and a disabled control is self-documenting in a
  // way an absent one is not.
  const hasControl = can(SCOPE_FLEET_CONTROL);

  // Arming carries no credential (auth-design.md decision 5): st-gateway
  // injects the game token, so the only inputs are the mode and the Clerk
  // session in the header.
  const [mode, setMode] = useState("live");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["autopilotStatus"] });

  const armMutation = useMutation({
    mutationFn: async () => automationService.arm(mode, await getToken()),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to arm autopilot"),
  });
  const pauseMutation = useMutation({
    mutationFn: async () => automationService.pause(await getToken()),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to pause autopilot"),
  });
  const abortMutation = useMutation({
    mutationFn: async () => automationService.abort(await getToken()),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to abort autopilot"),
  });

  const busy = armMutation.isPending || pauseMutation.isPending || abortMutation.isPending;
  const currentStatus = status?.status;
  // Arming (or re-arming, to switch live<->shadow)
  // is allowed from any status per automation-service's AutopilotState — only
  // pause/abort are gated by the current status.
  const canPause = hasControl && currentStatus === "armed";
  const canAbort = hasControl && (currentStatus === "armed" || currentStatus === "paused");

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
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={busy || !hasControl}
          className="lcars-autopilot-panel__mode-select"
        >
          <option value="live">Live</option>
          <option value="shadow">Shadow</option>
        </select>
        <PillButton type="submit" accent="green" disabled={busy || !hasControl}>
          Arm
        </PillButton>
      </form>

      {!hasControl && (
        <p className="lcars-autopilot-panel__gated">
          {isSignedIn
            ? "This account has no fleet:control scope. Controls are read-only."
            : "Sign in as an operator to arm, pause or abort."}
        </p>
      )}

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
