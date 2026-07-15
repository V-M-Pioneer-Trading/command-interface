import { useState } from "react";
import { PillButton } from "../common/PillButton";

export function CargoList({
  cargo,
  docked,
  hasMarketplace,
  currentWaypointSymbol,
  contracts,
  onSell,
  onDeliver,
  busy,
}) {
  const [activeRow, setActiveRow] = useState(null);
  const [units, setUnits] = useState(1);
  const [contractId, setContractId] = useState("");

  const inventory = cargo?.inventory || [];
  const activeContracts = (contracts || []).filter((c) => c.accepted && !c.fulfilled);

  if (inventory.length === 0) {
    return <div className="lcars-cargo-list__empty">Cargo hold empty</div>;
  }

  const openRow = (symbol, mode) => {
    setActiveRow(activeRow?.symbol === symbol && activeRow?.mode === mode ? null : { symbol, mode });
    setUnits(1);
    setContractId("");
  };

  const canSell = docked && hasMarketplace;

  return (
    <ul className="lcars-cargo-list">
      {inventory.map((item) => {
        const deliverableContracts = activeContracts.filter((c) =>
          (c.terms?.deliver || []).some(
            (d) =>
              d.tradeSymbol === item.symbol &&
              d.destinationSymbol === currentWaypointSymbol &&
              d.unitsFulfilled < d.unitsRequired
          )
        );
        const canDeliver = docked && deliverableContracts.length > 0;

        return (
          <li key={item.symbol} className="lcars-cargo-list__row">
            <div className="lcars-cargo-list__main">
              <span className="lcars-cargo-list__symbol">{item.symbol}</span>
              <span className="lcars-cargo-list__units">{item.units}</span>
              <PillButton
                accent="green"
                disabled={!canSell || busy}
                title={
                  !docked
                    ? "Ship must be docked to sell"
                    : !hasMarketplace
                    ? "No marketplace at this waypoint"
                    : undefined
                }
                onClick={() => openRow(item.symbol, "sell")}
              >
                Sell
              </PillButton>
              <PillButton
                accent="lavender"
                disabled={!canDeliver || busy}
                title={
                  !docked
                    ? "Ship must be docked to deliver"
                    : deliverableContracts.length === 0
                    ? "No contract needs this cargo delivered here"
                    : undefined
                }
                onClick={() => openRow(item.symbol, "deliver")}
              >
                Deliver
              </PillButton>
            </div>
            {activeRow?.symbol === item.symbol && (
              <div className="lcars-cargo-list__expand">
                {activeRow.mode === "deliver" && (
                  <select value={contractId} onChange={(e) => setContractId(e.target.value)}>
                    <option value="">Select contract...</option>
                    {deliverableContracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  min={1}
                  max={item.units}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                />
                <PillButton
                  accent="orange"
                  disabled={
                    busy ||
                    units < 1 ||
                    units > item.units ||
                    (activeRow.mode === "deliver" && !contractId)
                  }
                  onClick={() => {
                    if (activeRow.mode === "sell") {
                      onSell(item.symbol, units);
                    } else {
                      onDeliver(contractId, item.symbol, units);
                    }
                    setActiveRow(null);
                  }}
                >
                  Confirm
                </PillButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
