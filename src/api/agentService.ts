import { config } from "./config";
import { request } from "./client";
import type { Agent, Contract, Ship, ShipActionResponse } from "./types";

type AuthToken = string | null;

const base = config.agentServiceUrl;

// `getShips` and `getContracts` can answer a literal JSON `null`: agent-service
// sends one when the gateway's reply carries no `data` (its contract README,
// item 19: a missing list decodes to null, an empty one stays `[]`). The query
// hooks turn that into `[]`; the raw calls stay honest about it.
//
// Reads require a signed-in Clerk session and no particular scope: they are
// reads about the one account the fleet plays, so not anonymous (auth-design.md
// decision 3), but they move nothing. Writes require fleet:control, same as
// fleet-service. No game credential travels — st-gateway injects it upstream
// (decision 5).
export const agentService = {
  getCurrentAgent: (authToken: AuthToken) =>
    request<unknown>(base, "/current-agent", { authToken }),
  getAgent: (authToken: AuthToken) => request<Agent>(base, "/agent", { authToken }),
  getShips: (authToken: AuthToken) => request<Ship[] | null>(base, "/ships", { authToken }),
  getShip: (shipSymbol: string, authToken: AuthToken) =>
    request<Ship>(base, `/ships/${shipSymbol}`, { authToken }),
  getContracts: (authToken: AuthToken) => request<Contract[] | null>(base, "/contracts", { authToken }),
  getContract: (contractId: string, authToken: AuthToken) =>
    request<Contract>(base, `/contracts/${contractId}`, { authToken }),
  acceptContract: (contractId: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/contracts/${contractId}/accept`, { method: "POST", authToken }),
  fulfillContract: (contractId: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/contracts/${contractId}/fulfill`, { method: "POST", authToken }),
  purchaseCargo: (shipSymbol: string, symbol: string, units: number, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/purchase`, {
      method: "POST",
      authToken,
      body: { symbol, units },
    }),
  sell: (shipSymbol: string, symbol: string, units: number, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/sell`, {
      method: "POST",
      authToken,
      body: { symbol, units },
    }),
  purchaseShip: (shipType: string, waypointSymbol: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, "/ships/purchase", {
      method: "POST",
      authToken,
      body: { shipType, waypointSymbol },
    }),
};
