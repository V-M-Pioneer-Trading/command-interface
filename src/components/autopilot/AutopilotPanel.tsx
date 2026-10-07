import { nonEmpty } from "../../utils/nonEmpty";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../../context/AlertContext";
import { useAutopilotEventsQuery, useAutopilotStatusQuery } from "../../hooks/queries";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../context/OperatorContext";
import { queryKeys } from "../../hooks/queryKeys";
import { automationService } from "../../api/automationService";
import { PillButton } from "../common/PillButton";
import { QueryState } from "../common/QueryState";
import type { TogglePanelProps } from "../common/TogglePanelProps";
import "./AutopilotPanel.css";

const EVENT_LIMIT = 50;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AutopilotPanel({ onClose, style }: TogglePanelProps) {
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useAutopilotStatusQuery();
  const events = useAutopilotEventsQuery(EVENT_LIMIT);
  const { isSignedIn, can, getToken } = useOperator();

  // Rendered disabled rather than hidden. A visitor should be able to see that
  // an arm/pause surface exists and is gated — hiding it makes the system look
  // less capable than it is, and a disabled control is self-documenting in a
  // way an absent one is not.
  const hasControl = can(SCOPE_FLEET_CONTROL);

  // Returned, not voided: react-query awaits it, so the mutation stays pending
  // until the status refetch lands and a second click cannot hit a stale state.
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.autopilotStatus() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.autopilotEvents() }),
    ]);

  const armMutation = useMutation({
    mutationFn: async () => automationService.arm(await getToken()),
    onSuccess: invalidate,
    onError: (err: Error) => pushAlert(err.message || "Failed to arm autopilot"),
  });
  const pauseMutation = useMutation({
    mutationFn: async () => automationService.pause(await getToken()),
    onSuccess: invalidate,
    onError: (err: Error) => pushAlert(err.message || "Failed to pause autopilot"),
  });

  const busy = armMutation.isPending || pauseMutation.isPending;
  const currentStatus = status?.status;
  const canArm = hasControl && currentStatus !== "armed";
  const canPause = hasControl && currentStatus === "armed";

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
        <span className={`lcars-autopilot-panel__status-value status-${nonEmpty(currentStatus) ?? "unknown"}`}>
          {isLoading ? "..." : nonEmpty(currentStatus?.toUpperCase()) ?? "UNKNOWN"}
        </span>
      </div>

      {status && (
        <dl className="lcars-autopilot-panel__row">
          <dt>SHIP</dt>
          <dd>{status.shipSymbol}</dd>
          <dt>PHASE</dt>
          <dd>{status.phase}</dd>
          <dt>ASTEROID</dt>
          <dd>{status.asteroid ?? "—"}</dd>
          <dt>MARKET</dt>
          <dd>{status.market ?? "—"}</dd>
          <dt>WAITING UNTIL</dt>
          <dd>{status.waitingUntil ? new Date(status.waitingUntil).toLocaleString() : "—"}</dd>
          <dt>UPDATED</dt>
          <dd>{formatTime(status.updatedAt)}</dd>
        </dl>
      )}

      {!hasControl && (
        <p className="lcars-autopilot-panel__gated">
          {isSignedIn
            ? "This account has no fleet:control scope. Controls are read-only."
            : "Sign in as an operator to arm or pause."}
        </p>
      )}

      <div className="lcars-autopilot-panel__actions">
        <PillButton accent="green" disabled={!canArm || busy} onClick={() => { armMutation.mutate(); }}>
          Arm
        </PillButton>
        <PillButton accent="yellow" disabled={!canPause || busy} onClick={() => { pauseMutation.mutate(); }}>
          Pause
        </PillButton>
      </div>

      <section className="lcars-autopilot-panel__events">
        <h3>Events</h3>
        <QueryState query={events}>
          {(list) =>
            list.length === 0 ? (
              <p className="lcars-autopilot-panel__empty">No events yet</p>
            ) : (
              <ul>
                {list.map((e) => (
                  <li key={e.id}>
                    <span className="lcars-autopilot-panel__event-time">{formatTime(e.occurredAt)}</span>
                    <span className="lcars-autopilot-panel__event-type">{e.type}</span>
                    <code>{JSON.stringify(e.detail)}</code>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </section>
    </div>
  );
}
