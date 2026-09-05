import { config } from "./config";
import { request } from "./client";

const base = config.fleetServiceUrl;

// One credential: `authToken`, the Clerk session. fleet-service verifies it
// (fleet:control on every mutation, a signed-in operator on the two reads) and
// forwards it to st-gateway, which injects the game token and derives queue
// priority from the session it just verified — auth-design.md decisions 2 and 5.
export const fleetService = {
  orbit: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/orbit`, { method: "POST", authToken }),
  dock: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/dock`, { method: "POST", authToken }),
  navigate: (shipSymbol, waypointSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/navigate`, {
      method: "POST",
      authToken,
      body: { waypointSymbol },
    }),
  extract: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/extract`, { method: "POST", authToken }),
  extractWithSurvey: (shipSymbol, survey, authToken) =>
    request(base, `/ships/${shipSymbol}/extract/survey`, {
      method: "POST",
      authToken,
      body: survey,
    }),
  survey: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/survey`, { method: "POST", authToken }),
  refuel: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/refuel`, { method: "POST", authToken }),
  getCooldown: (shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/cooldown`, { authToken }),
  getCargo: (shipSymbol, authToken) => request(base, `/ships/${shipSymbol}/cargo`, { authToken }),
  deliverContract: (contractId, shipSymbol, tradeSymbol, units, authToken) =>
    request(base, `/contracts/${contractId}/deliver`, {
      method: "POST",
      authToken,
      body: { shipSymbol, tradeSymbol, units },
    }),
  setFlightMode: (shipSymbol, flightMode, authToken) =>
    request(base, `/ships/${shipSymbol}/nav`, {
      method: "PATCH",
      authToken,
      body: { flightMode },
    }),
  transferCargo: (shipSymbol, tradeSymbol, units, targetShipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}/transfer`, {
      method: "POST",
      authToken,
      body: { tradeSymbol, units, shipSymbol: targetShipSymbol },
    }),
};
