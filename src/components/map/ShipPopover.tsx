import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../utils/spaceTraders";
import type { Ship } from "../../api/types";
import { nonEmpty } from "../../utils/nonEmpty";

const STATUS_LABEL: Record<string, string> = {
  DOCKED: "Docked",
  IN_ORBIT: "In orbit",
  IN_TRANSIT: "In transit",
};

function Bar({
  label,
  current,
  capacity,
}: {
  label: string;
  current: number;
  capacity: number | null | undefined;
}) {
  if (capacity === undefined || capacity === null) return null;
  const pct = capacity > 0 ? Math.min(100, Math.max(0, (current / capacity) * 100)) : 0;
  return (
    <div className="lcars-map-popover__meter">
      <span className="lcars-map-popover__meter-label">{label}</span>
      <span className="lcars-map-popover__meter-track">
        <span className="lcars-map-popover__meter-fill" style={{ width: `${String(pct)}%` }} />
      </span>
      <span className="lcars-map-popover__meter-value">
        {current}/{capacity}
      </span>
    </div>
  );
}

/**
 * Details for a ship clicked on the map. Deliberately a summary, not a second
 * ship-detail panel — clicking also selects the ship, so the full panel on the
 * right is already showing cargo, actions and everything else.
 */
export function ShipPopover({ ship, onClose }: { ship: Ship; onClose: () => void }) {
  const arrival = ship.nav.status === "IN_TRANSIT" ? ship.nav.route.arrival : null;
  const remaining = useCountdown(arrival);

  const status = STATUS_LABEL[ship.nav.status] ?? nonEmpty(ship.nav.status) ?? "Unknown";
  const destination = ship.nav.route.destination.symbol;

  return (
    <div className="lcars-map-popover">
      <button type="button" className="lcars-map-popover__close" onClick={onClose}>
        ×
      </button>
      <h3>{ship.symbol}</h3>
      <div className="lcars-map-popover__type">
        {ship.registration.role || "—"} · {ship.frame.name || ship.frame.symbol || "—"}
      </div>

      <dl className="lcars-map-popover__facts">
        <dt>Status</dt>
        <dd className={`is-${(ship.nav.status || "").toLowerCase()}`}>{status}</dd>

        <dt>{ship.nav.status === "IN_TRANSIT" ? "Bound for" : "Location"}</dt>
        <dd>{destination || ship.nav.waypointSymbol || "—"}</dd>

        {arrival && remaining > 0 && (
          <>
            <dt>ETA</dt>
            <dd>{formatCountdown(remaining)}</dd>
          </>
        )}

        {ship.nav.flightMode && (
          <>
            <dt>Flight mode</dt>
            <dd>{ship.nav.flightMode}</dd>
          </>
        )}
      </dl>

      <Bar label="Fuel" current={ship.fuel.current} capacity={ship.fuel.capacity} />
      <Bar label="Cargo" current={ship.cargo.units} capacity={ship.cargo.capacity} />
    </div>
  );
}
