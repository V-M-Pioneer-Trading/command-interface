import { useState } from "react";
import { PillButton } from "../common/PillButton";

export function MarketList({ market, docked, credits, busy, onBuy }) {
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [units, setUnits] = useState(1);

  const tradeGoods = market?.tradeGoods || [];

  if (tradeGoods.length === 0) {
    return <div className="lcars-market-list__empty">No goods for sale here</div>;
  }

  const openRow = (symbol) => {
    setActiveSymbol(activeSymbol === symbol ? null : symbol);
    setUnits(1);
  };

  return (
    <ul className="lcars-market-list">
      {tradeGoods.map((good) => {
        const cost = good.purchasePrice * units;
        const canAfford = credits === undefined || credits >= cost;
        const canBuy = docked && canAfford;

        return (
          <li key={good.symbol} className="lcars-market-list__row">
            <div className="lcars-market-list__main">
              <span className="lcars-market-list__symbol">{good.symbol}</span>
              <span className="lcars-market-list__price">{good.purchasePrice}cr</span>
              <PillButton
                accent="blue"
                disabled={!docked || busy}
                title={!docked ? "Ship must be docked to buy" : undefined}
                onClick={() => openRow(good.symbol)}
              >
                Buy
              </PillButton>
            </div>
            {activeSymbol === good.symbol && (
              <div className="lcars-market-list__expand">
                <input
                  type="number"
                  min={1}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                />
                <PillButton
                  accent="orange"
                  disabled={busy || units < 1 || !canBuy}
                  title={!canAfford ? "Not enough credits" : undefined}
                  onClick={() => {
                    onBuy(good.symbol, units);
                    setActiveSymbol(null);
                  }}
                >
                  Confirm ({cost}cr)
                </PillButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
