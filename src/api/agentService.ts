import { config } from "./config";
import { bearer, serviceClient, unwrap } from "./serviceClient";
import type { components, paths } from "../generated/agent-service";

type AuthToken = string | null;

// Types keep the spec's schema names. Call sites import them from here.
type Schemas = components["schemas"];
export type Agent = Schemas["Agent"];
export type Ship = Schemas["Ship"];
export type ShipCargo = Schemas["ShipCargo"];
export type ShipNav = Schemas["ShipNav"];
export type CargoItem = Schemas["CargoItem"];
export type Contract = Schemas["Contract"];

const client = serviceClient<paths>(config.agentServiceUrl);

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
  getCurrentAgent: (authToken: AuthToken) => unwrap(client.GET(`/api/agent/v1/current-agent`, bearer(authToken))),
  getAgent: (authToken: AuthToken) => unwrap(client.GET(`/api/agent/v1/agent`, bearer(authToken))),
  getShips: (authToken: AuthToken) => unwrap(client.GET(`/api/agent/v1/ships`, bearer(authToken))),
  getShip: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.GET(`/api/agent/v1/ships/{shipSymbol}`, { params: { path: { shipSymbol } }, ...bearer(authToken) })),
  getContracts: (authToken: AuthToken) => unwrap(client.GET(`/api/agent/v1/contracts`, bearer(authToken))),
  getContract: (contractId: string, authToken: AuthToken) =>
    unwrap(
      client.GET(`/api/agent/v1/contracts/{contractId}`, { params: { path: { contractId } }, ...bearer(authToken) }),
    ),
  acceptContract: (contractId: string, authToken: AuthToken) =>
    unwrap(
      client.POST(`/api/agent/v1/contracts/{contractId}/accept`, {
        params: { path: { contractId } },
        ...bearer(authToken),
      }),
    ),
  fulfillContract: (contractId: string, authToken: AuthToken) =>
    unwrap(
      client.POST(`/api/agent/v1/contracts/{contractId}/fulfill`, {
        params: { path: { contractId } },
        ...bearer(authToken),
      }),
    ),
  purchaseCargo: (shipSymbol: string, symbol: string, units: number, authToken: AuthToken) =>
    unwrap(
      client.POST(`/api/agent/v1/ships/{shipSymbol}/purchase`, {
        params: { path: { shipSymbol } },
        body: { symbol, units },
        ...bearer(authToken),
      }),
    ),
  sell: (shipSymbol: string, symbol: string, units: number, authToken: AuthToken) =>
    unwrap(
      client.POST(`/api/agent/v1/ships/{shipSymbol}/sell`, {
        params: { path: { shipSymbol } },
        body: { symbol, units },
        ...bearer(authToken),
      }),
    ),
  purchaseShip: (shipType: string, waypointSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST(`/api/agent/v1/ships/purchase`, { body: { shipType, waypointSymbol }, ...bearer(authToken) })),
};
