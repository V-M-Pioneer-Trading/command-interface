import { useMemo, useState } from "react";
import { useSystemWaypointsQuery, useShipsQuery } from "../../hooks/queries";
import { useSelection } from "../../context/SelectionContext";
import { useElementSize } from "../../hooks/useElementSize";
import { useAnimationClock } from "../../hooks/useAnimationClock";
import { useMapViewport } from "../../hooks/useMapViewport";
import { ZOOM_STEP, computeBounds, computeFit } from "../../map/viewport";
import { buildSystemLayout, shipRenderState } from "../../map/systemLayout";
import { waypointSpriteId } from "../../map/sprites/registry";
import { roleBadgeId, shipFamily, traitBadgeId } from "../../map/sprites/ships";
import { Panel } from "../common/Panel";
import { SpriteDefs } from "./SpriteDefs";
import { MapControls } from "./MapControls";
import { OrbitRingLayer, activeRingSymbol } from "./layers/OrbitRingLayer";
import { TransitPathLayer } from "./layers/TransitPathLayer";
import { WaypointLayer } from "./layers/WaypointLayer";
import { ShipLayer } from "./layers/ShipLayer";
import { LabelLayer } from "./layers/LabelLayer";
import { WaypointPopover } from "./WaypointPopover";
import { ShipPopover } from "./ShipPopover";
import "./SystemMap.css";

// Leaves room for orbit-ring offsets and labels at the edge of the system.
const FIT_PADDING = 44;

export function SystemMap({ token, systemSymbol }) {
  const { data: waypointData, isLoading } = useSystemWaypointsQuery(token, systemSymbol);
  const { data: ships } = useShipsQuery(token);
  const { selectedShipSymbol, setSelectedShipSymbol } = useSelection();
  // One popover at a time: {kind: "waypoint", waypoint} | {kind: "ship", symbol}
  const [detail, setDetail] = useState(null);
  const [hovered, setHovered] = useState(null);

  const { ref: canvasRef, size } = useElementSize();
  const { width, height } = size;
  const { view, isDragging, svgRef, zoomBy, reset, centerOnPoint, bind } = useMapViewport({
    width,
    height,
  });

  const waypoints = waypointData?.data || [];

  const layout = useMemo(() => {
    const fit = computeFit(computeBounds(waypoints), width, height, FIT_PADDING);
    return buildSystemLayout(waypoints, fit);
  }, [waypoints, width, height]);

  const shipsInSystem = useMemo(
    () => (ships || []).filter((s) => s.nav?.systemSymbol === systemSymbol),
    [ships, systemSymbol],
  );
  const hasTransit = shipsInSystem.some((s) => s.nav?.status === "IN_TRANSIT");
  const now = useAnimationClock(hasTransit);

  const placedShips = useMemo(
    () =>
      shipsInSystem
        .map((ship) => ({ ship, pos: shipRenderState(ship.nav, layout.index, now) }))
        .filter((s) => s.pos),
    [shipsInSystem, layout, now],
  );

  const transits = useMemo(
    () =>
      shipsInSystem
        .filter((s) => s.nav?.status === "IN_TRANSIT")
        .map((s) => ({
          key: s.symbol,
          from: layout.index.get(s.nav.route?.origin?.symbol),
          to: layout.index.get(s.nav.route?.destination?.symbol),
        }))
        .filter((t) => t.from && t.to),
    [shipsInSystem, layout],
  );

  // Only the symbols actually on screen get emitted into <defs>.
  const spriteIds = useMemo(() => {
    const ids = new Set();
    for (const node of layout.nodes) {
      ids.add(waypointSpriteId(node.symbol, node.type));
      for (const trait of node.waypoint.traits || []) {
        const id = traitBadgeId(trait.symbol);
        if (id) ids.add(id);
      }
      if (node.waypoint.isUnderConstruction) ids.add(traitBadgeId("UNDER_CONSTRUCTION"));
    }
    for (const { ship } of placedShips) {
      ids.add(`ship-${shipFamily(ship.frame?.symbol)}`);
      const badge = roleBadgeId(ship.registration?.role);
      if (badge) ids.add(badge);
    }
    return [...ids];
  }, [layout, placedShips]);

  // Clicking anything on the map both opens its popover and pans it to centre,
  // so the popover always describes something you can see.
  const selectWaypoint = (node) => {
    setDetail({ kind: "waypoint", waypoint: node.waypoint });
    centerOnPoint(node.x, node.y);
  };

  const selectShip = (symbol, pos) => {
    setSelectedShipSymbol(symbol);
    setDetail({ kind: "ship", symbol });
    centerOnPoint(pos.x, pos.y);
  };

  // Re-read from the live ships list rather than snapshotting on click, so the
  // popover's fuel/cargo/ETA stay current as the poll refreshes underneath it.
  const detailShip =
    detail?.kind === "ship" ? shipsInSystem.find((s) => s.symbol === detail.symbol) : null;

  const ready = !isLoading && waypoints.length > 0 && width > 0 && height > 0;

  return (
    <Panel
      title={systemSymbol ? `System Map — ${systemSymbol}` : "System Map"}
      accent="blue"
      className="lcars-system-map"
    >
      <div className="lcars-system-map__canvas" ref={canvasRef}>
        {isLoading && <div className="lcars-system-map__loading">Loading system...</div>}
        {ready && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`lcars-system-map__svg${isDragging ? " is-dragging" : ""}`}
            tabIndex={0}
            onClick={() => setDetail(null)}
            {...bind}
          >
            <SpriteDefs ids={spriteIds} />
            <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
              <OrbitRingLayer
                rings={layout.rings}
                scale={view.scale}
                activeSymbol={activeRingSymbol(hovered, layout.index)}
              />
              <TransitPathLayer transits={transits} scale={view.scale} />
              <WaypointLayer
                nodes={layout.nodes}
                scale={view.scale}
                selectedSymbol={detail?.kind === "waypoint" ? detail.waypoint.symbol : null}
                onSelect={selectWaypoint}
                onHover={setHovered}
              />
              <ShipLayer
                ships={placedShips}
                scale={view.scale}
                selectedSymbol={selectedShipSymbol}
                onSelect={selectShip}
              />
              <LabelLayer
                nodes={layout.nodes}
                ships={placedShips}
                scale={view.scale}
                hovered={hovered}
                selectedWaypoint={detail?.kind === "waypoint" ? detail.waypoint.symbol : null}
                selectedShip={selectedShipSymbol}
              />
            </g>
          </svg>
        )}
        {ready && (
          <MapControls
            scale={view.scale}
            onZoomIn={() => zoomBy(ZOOM_STEP)}
            onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
            onReset={reset}
          />
        )}
        {detail?.kind === "waypoint" && (
          <WaypointPopover
            token={token}
            waypoint={detail.waypoint}
            onClose={() => setDetail(null)}
          />
        )}
        {detailShip && <ShipPopover ship={detailShip} onClose={() => setDetail(null)} />}
      </div>
    </Panel>
  );
}
