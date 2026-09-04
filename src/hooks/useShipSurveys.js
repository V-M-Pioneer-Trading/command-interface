import { useState } from "react";

/**
 * Surveys found by one ship, scoped to that ship.
 *
 * A survey is a signature the SpaceTraders API issued to a specific ship at a
 * specific asteroid, and it only exists in this browser — nothing persists it.
 * Held as a bare list it outlived the fleet selection: picking a second ship
 * still showed the first ship's surveys, and extracting with one sent another
 * ship's signature to fleet-service.
 *
 * Tagging the list with the ship it came from makes that unrepresentable —
 * switching ships reports no surveys, and switching back is not a way to
 * resurrect them (the tag is overwritten on the next survey, not merged).
 */
export function useShipSurveys(shipSymbol) {
  const [state, setState] = useState({ shipSymbol: null, surveys: [] });

  return {
    surveys: state.shipSymbol === shipSymbol ? state.surveys : [],
    addSurveys: (found) =>
      setState((prev) => ({
        shipSymbol,
        surveys: prev.shipSymbol === shipSymbol ? [...prev.surveys, ...found] : [...found],
      })),
  };
}
