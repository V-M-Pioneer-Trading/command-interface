import { useState } from "react";
import { navigationService } from "../../api/navigationService";
import { PillButton } from "../common/PillButton";
import { useAlerts } from "../../context/AlertContext";

export function WaypointPopover({ token, waypoint, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(null);
  const { pushAlert } = useAlerts();

  const traitSymbols = (waypoint.traits || []).map((t) => t.symbol);
  const hasMarket = traitSymbols.includes("MARKETPLACE");
  const hasShipyard = traitSymbols.includes("SHIPYARD");

  const loadMarket = async () => {
    setLoading("market");
    try {
      const market = await navigationService.getMarket(token, waypoint.symbol);
      setDetail({ kind: "market", data: market });
    } catch (err) {
      pushAlert(err.message || "Failed to load market");
    } finally {
      setLoading(null);
    }
  };

  const loadShipyard = async () => {
    setLoading("shipyard");
    try {
      const shipyard = await navigationService.getShipyard(token, waypoint.symbol);
      setDetail({ kind: "shipyard", data: shipyard });
    } catch (err) {
      pushAlert(err.message || "Failed to load shipyard");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="lcars-waypoint-popover">
      <button type="button" className="lcars-waypoint-popover__close" onClick={onClose}>
        ×
      </button>
      <h3>{waypoint.symbol}</h3>
      <div className="lcars-waypoint-popover__type">{waypoint.type}</div>
      {traitSymbols.length > 0 && (
        <div className="lcars-waypoint-popover__traits">{traitSymbols.join(", ")}</div>
      )}
      <div className="lcars-waypoint-popover__actions">
        {hasMarket && (
          <PillButton accent="blue" onClick={loadMarket} disabled={loading === "market"}>
            {loading === "market" ? "Loading..." : "Market"}
          </PillButton>
        )}
        {hasShipyard && (
          <PillButton accent="violet" onClick={loadShipyard} disabled={loading === "shipyard"}>
            {loading === "shipyard" ? "Loading..." : "Shipyard"}
          </PillButton>
        )}
      </div>
      {detail?.kind === "market" && (
        <ul className="lcars-waypoint-popover__list">
          {(detail.data.tradeGoods || []).map((g) => (
            <li key={g.symbol}>
              {g.symbol} — sell {g.sellPrice} / buy {g.purchasePrice}
            </li>
          ))}
        </ul>
      )}
      {detail?.kind === "shipyard" && (
        <ul className="lcars-waypoint-popover__list">
          {(detail.data.shipTypes || []).map((s) => (
            <li key={s.type}>{s.type}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
