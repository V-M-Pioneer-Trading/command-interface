import { config } from "./config";
import { request } from "./client";

const base = config.agentServiceUrl;

// Reads require a signed-in Clerk session and no particular scope: they are
// reads about the one account the fleet plays, so not anonymous (auth-design.md
// decision 3), but they move nothing. Writes require fleet:control, same as
// fleet-service. No game credential travels — st-gateway injects it upstream
// (decision 5).
export const agentService = {
  getCurrentAgent: (authToken) => request(base, "/current-agent", { authToken }),
  getAgent: (authToken) => request(base, "/agent", { authToken }),
  getShips: (authToken) => request(base, "/ships", { authToken }),
  getShip: (shipSymbol, authToken) => request(base, `/ships/${shipSymbol}`, { authToken }),
  getContracts: (authToken) => request(base, "/contracts", { authToken }),
  getContract: (contractId, authToken) => request(base, `/contracts/${contractId}`, { authToken }),
  acceptContract: (contractId, authToken) =>
    request(base, `/contracts/${contractId}/accept`, { method: "POST", authToken }),
  fulfillContract: (contractId, authToken) =>
    request(base, `/contracts/${contractId}/fulfill`, { method: "POST", authToken }),
  purchaseCargo: (shipSymbol, symbol, units, authToken) =>
    request(base, `/ships/${shipSymbol}/purchase`, {
      method: "POST",
      authToken,
      body: { symbol, units },
    }),
  sell: (shipSymbol, symbol, units, authToken) =>
    request(base, `/ships/${shipSymbol}/sell`, {
      method: "POST",
      authToken,
      body: { symbol, units },
    }),
  purchaseShip: (shipType, waypointSymbol, authToken) =>
    request(base, "/ships/purchase", {
      method: "POST",
      authToken,
      body: { shipType, waypointSymbol },
    }),
};
