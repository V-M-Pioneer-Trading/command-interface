import { config } from "./config";
import { request } from "./client";

const base = config.fleetServiceUrl;

// Every route here mutates or reads live per-ship state, so every call needs
// both credentials: `authToken` (Clerk, fleet:control) is what fleet-service
// verifies; `token` (SpaceTraders) is what it forwards upstream. Neither
// substitutes for the other.
export const fleetService = {
  orbit: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/orbit`, { method: "POST", token, authToken }),
  dock: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/dock`, { method: "POST", token, authToken }),
  navigate: (token, shipSymbol, waypointSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/navigate`, {
      method: "POST",
      token,
      authToken,
      body: { waypointSymbol },
    }),
  extract: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/extract`, { method: "POST", token, authToken }),
  extractWithSurvey: (token, shipSymbol, survey, authToken) =>
    request(base, `/ships/${shipSymbol}/extract/survey`, {
      method: "POST",
      token,
      authToken,
      body: survey,
    }),
  survey: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/survey`, { method: "POST", token, authToken }),
  refuel: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/refuel`, { method: "POST", token, authToken }),
  getCooldown: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/cooldown`, { token, authToken }),
  getCargo: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/cargo`, { token, authToken }),
  deliverContract: (token, contractId, shipSymbol, tradeSymbol, units, authToken) =>
    request(base, `/contracts/${contractId}/deliver`, {
      method: "POST",
      token,
      authToken,
      body: { shipSymbol, tradeSymbol, units },
    }),
  setFlightMode: (token, shipSymbol, flightMode, authToken) =>
    request(base, `/ships/${shipSymbol}/nav`, {
      method: "PATCH",
      token,
      authToken,
      body: { flightMode },
    }),
  transferCargo: (token, shipSymbol, tradeSymbol, units, targetShipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/transfer`, {
      method: "POST",
      token,
      authToken,
      body: { tradeSymbol, units, shipSymbol: targetShipSymbol },
    }),
};
