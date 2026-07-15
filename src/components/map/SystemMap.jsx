import { useMemo, useState } from "react";
import { useSystemWaypointsQuery, useShipsQuery } from "../../hooks/queries";
import { useSelection } from "../../context/SelectionContext";
import { Panel } from "../common/Panel";
import { WaypointIcon } from "./WaypointIcon";
import { ShipMarker } from "./ShipMarker";
import { WaypointPopover } from "./WaypointPopover";
import "./SystemMap.css";

const VIEW_SIZE = 640;
const PADDING = 60;

export function SystemMap({ token, systemSymbol }) {
  const { data: waypointData, isLoading } = useSystemWaypointsQuery(token, systemSymbol);
  const { data: ships } = useShipsQuery(token);
  const { selectedShipSymbol, setSelectedShipSymbol } = useSelection();
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);

  const waypoints = waypointData?.data || [];

  const bounds = useMemo(() => {
    if (waypoints.length === 0) return null;
    const xs = waypoints.map((w) => w.x);
    const ys = waypoints.map((w) => w.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [waypoints]);

  const scaled = useMemo(() => {
    if (!bounds) return { waypoints: [], scale: () => ({ x: 0, y: 0 }) };
    const spanX = Math.max(bounds.maxX - bounds.minX, 1);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1);
    const span = Math.max(spanX, spanY);
    const drawable = VIEW_SIZE - PADDING * 2;
    const scale = (x, y) => ({
      x: PADDING + ((x - bounds.minX) / span) * drawable,
      y: PADDING + ((y - bounds.minY) / span) * drawable,
    });
    return { scale };
  }, [bounds]);

  const scaledWaypoints = waypoints.map((w) => ({ ...w, ...scaled.scale(w.x, w.y) }));

  const shipsInSystem = (ships || []).filter((s) => s.nav?.systemSymbol === systemSymbol);
  const scaledShips = shipsInSystem.map((ship) => {
    if (!ship.nav?.route) {
      const wp = scaledWaypoints.find((w) => w.symbol === ship.nav?.waypointSymbol);
      return { ship, nav: wp ? { ...ship.nav, route: { destination: wp } } : ship.nav };
    }
    const origin = scaled.scale(ship.nav.route.origin.x, ship.nav.route.origin.y);
    const destination = scaled.scale(ship.nav.route.destination.x, ship.nav.route.destination.y);
    return {
      ship,
      nav: {
        ...ship.nav,
        route: {
          ...ship.nav.route,
          origin: { ...ship.nav.route.origin, ...origin },
          destination: { ...ship.nav.route.destination, ...destination },
        },
      },
    };
  });

  return (
    <Panel title={systemSymbol ? `System Map — ${systemSymbol}` : "System Map"} accent="blue" className="lcars-system-map">
      <div className="lcars-system-map__canvas">
        {isLoading && <div className="lcars-system-map__loading">Loading system...</div>}
        {!isLoading && waypoints.length > 0 && (
          <svg
            viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
            className="lcars-system-map__svg"
            onClick={() => setSelectedWaypoint(null)}
          >
            {scaledWaypoints.map((w) => (
              <WaypointIcon key={w.symbol} waypoint={w} onClick={setSelectedWaypoint} />
            ))}
            {scaledShips.map(({ ship, nav }) => (
              <ShipMarker
                key={ship.symbol}
                ship={{ ...ship, nav }}
                isSelected={ship.symbol === selectedShipSymbol}
                onClick={setSelectedShipSymbol}
              />
            ))}
          </svg>
        )}
        {selectedWaypoint && (
          <WaypointPopover
            token={token}
            waypoint={selectedWaypoint}
            onClose={() => setSelectedWaypoint(null)}
          />
        )}
      </div>
    </Panel>
  );
}
