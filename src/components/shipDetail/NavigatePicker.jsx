import { useState } from "react";
import { useSystemWaypointsQuery } from "../../hooks/queries";
import { PillButton } from "../common/PillButton";

export function NavigatePicker({ token, systemSymbol, disabled, onNavigate, isNavigating }) {
  const { data } = useSystemWaypointsQuery(token, systemSymbol);
  const waypoints = data?.data || [];
  const [target, setTarget] = useState("");

  return (
    <div className="lcars-navigate-picker">
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select waypoint...</option>
        {waypoints.map((w) => (
          <option key={w.symbol} value={w.symbol}>
            {w.symbol} ({w.type})
          </option>
        ))}
      </select>
      <PillButton
        accent="blue"
        disabled={disabled || !target || isNavigating}
        onClick={() => onNavigate(target)}
      >
        {isNavigating ? "Navigating..." : "Navigate"}
      </PillButton>
    </div>
  );
}
