import { useShipsQuery } from "../../hooks/queries";
import { useSelection } from "../../context/SelectionContext";
import { Panel } from "../common/Panel";
import { StatusPill } from "../common/StatusPill";
import "./FleetList.css";

export function FleetList({ token }) {
  const { data: ships, isLoading } = useShipsQuery(token);
  const { selectedShipSymbol, setSelectedShipSymbol } = useSelection();

  return (
    <Panel title="Fleet" accent="orange" className="lcars-fleet-list">
      {isLoading && <div className="lcars-fleet-list__empty">Loading ships...</div>}
      {!isLoading && ships?.length === 0 && (
        <div className="lcars-fleet-list__empty">No ships</div>
      )}
      <ul className="lcars-fleet-list__items">
        {ships?.map((ship) => (
          <li key={ship.symbol}>
            <button
              type="button"
              className={`lcars-fleet-list__row ${
                ship.symbol === selectedShipSymbol ? "is-selected" : ""
              }`}
              onClick={() => setSelectedShipSymbol(ship.symbol)}
            >
              <span className="lcars-fleet-list__symbol">{ship.symbol}</span>
              <StatusPill status={ship.nav?.status} />
              <span className="lcars-fleet-list__waypoint">
                {ship.nav?.status === "IN_TRANSIT"
                  ? `→ ${ship.nav?.route?.destination?.symbol}`
                  : ship.nav?.waypointSymbol}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
