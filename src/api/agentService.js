import { config } from "./config";
import { request } from "./client";

const base = config.agentServiceUrl;

// Reads require only a signed-in Clerk session (no scope) plus the
// SpaceTraders token to forward — decision 18 defers full public access here
// until auth-service exists to serve anonymous callers with a credential of
// its own. Writes require fleet:control, same as fleet-service.
export const agentService = {
  getCurrentAgent: (token, authToken) => request(base, "/current-agent", { token, authToken }),
  getAgent: (token, authToken) => request(base, "/agent", { token, authToken }),
  getShips: (token, authToken) => request(base, "/ships", { token, authToken }),
  getShip: (token, shipSymbol, authToken) =>
    request(base, `/ships/${shipSymbol}`, { token, authToken }),
  getContracts: (token, authToken) => request(base, "/contracts", { token, authToken }),
  getContract: (token, contractId, authToken) =>
    request(base, `/contracts/${contractId}`, { token, authToken }),
  acceptContract: (token, contractId, authToken) =>
    request(base, `/contracts/${contractId}/accept`, { method: "POST", token, authToken }),
  fulfillContract: (token, contractId, authToken) =>
    request(base, `/contracts/${contractId}/fulfill`, { method: "POST", token, authToken }),
  purchaseCargo: (token, shipSymbol, symbol, units, authToken) =>
    request(base, `/ships/${shipSymbol}/purchase`, {
      method: "POST",
      token,
      authToken,
      body: { symbol, units },
    }),
  sell: (token, shipSymbol, symbol, units, authToken) =>
    request(base, `/ships/${shipSymbol}/sell`, {
      method: "POST",
      token,
      authToken,
      body: { symbol, units },
    }),
  purchaseShip: (token, shipType, waypointSymbol, authToken) =>
    request(base, "/ships/purchase", {
      method: "POST",
      token,
      authToken,
      body: { shipType, waypointSymbol },
    }),
};
