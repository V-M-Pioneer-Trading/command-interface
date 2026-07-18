import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { navigationService } from "../../api/navigationService";
import { fleetService } from "../../api/fleetService";
import { PillButton } from "../common/PillButton";
import { useAlerts } from "../../context/AlertContext";
import { useAgentQuery } from "../../hooks/queries";

export function WaypointPopover({ token, waypoint, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const { pushAlert } = useAlerts();
  const { data: agent } = useAgentQuery(token);
  const queryClient = useQueryClient();

  const purchaseShipMutation = useMutation({
    mutationFn: (shipType) => fleetService.purchaseShip(token, shipType, waypoint.symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ships", token] });
      queryClient.invalidateQueries({ queryKey: ["agent", token] });
      setActiveType(null);
    },
    onError: (err) => pushAlert(err.message || "Purchase failed"),
  });

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
          {(detail.data.shipTypes || []).map((s) => {
            const priced = (detail.data.ships || []).find((sh) => sh.type === s.type);
            const cost = priced?.purchasePrice;
            const canAfford = agent?.credits === undefined || cost === undefined || agent.credits >= cost;

            return (
              <li key={s.type} className="lcars-waypoint-popover__shipyard-row">
                <div className="lcars-waypoint-popover__shipyard-main">
                  <span>{s.type}</span>
                  <span>{cost !== undefined ? `${cost}cr` : "—"}</span>
                  <PillButton
                    accent="orange"
                    disabled={cost === undefined || purchaseShipMutation.isPending}
                    title={
                      cost === undefined
                        ? "Dock a ship here to see price & buy"
                        : undefined
                    }
                    onClick={() => setActiveType(activeType === s.type ? null : s.type)}
                  >
                    Buy
                  </PillButton>
                </div>
                {activeType === s.type && cost !== undefined && (
                  <div className="lcars-waypoint-popover__shipyard-confirm">
                    <PillButton
                      accent="red"
                      disabled={!canAfford || purchaseShipMutation.isPending}
                      title={!canAfford ? "Not enough credits" : undefined}
                      onClick={() => purchaseShipMutation.mutate(s.type)}
                    >
                      {purchaseShipMutation.isPending ? "Purchasing..." : `Confirm (${cost}cr)`}
                    </PillButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
