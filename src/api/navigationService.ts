import { config } from "./config";
import { bearer, serviceClient, unwrap, type AuthToken } from "./serviceClient";
import type { components, paths } from "../generated/navigation-service";

// Types keep the spec's schema names. Call sites import them from here.
type Schemas = components["schemas"];
export type Waypoint = Schemas["Waypoint"];
export type WaypointTrait = Schemas["WaypointTrait"];
export type SystemWaypointsResponse = Schemas["SystemWaypointsResponse"];
export type Market = Schemas["Market"];
export type MarketTradeGood = Schemas["MarketTradeGood"];
export type Shipyard = Schemas["Shipyard"];

const client = serviceClient<paths>(config.navigationServiceUrl);

// Public: navigation-service serves from its SQLite cache for anyone, and a
// verified Clerk session extends that to a live fetch-and-store on a miss
// (auth-design.md decisions 2 and 3). The axis is who is asking, not which
// credential they carry — st-gateway supplies the game token upstream
// (decision 5), so a signed-in operator is all navigation-service needs.
//
// The token is optional, unlike the other services: the map's own
// market/shipyard lookups go out anonymously, and an anonymous call sends no
// headers at all (a CORS-simple request, no preflight). The spec has no header
// parameters and declares every error status without a body, so a 4xx still
// raises `ApiError` from the status text (or from a JSON body, if one came).
//
// The four POST .../refresh routes additionally require the `universe:refresh`
// scope (decision 20) and are not called from this UI; nor is `forceRefresh`.
export const navigationService = {
  getWaypoint: (symbol: string, authToken?: AuthToken) =>
    unwrap(client.GET("/api/navigation/v1/waypoints/{symbol}", { params: { path: { symbol } }, ...bearer(authToken) })),
  getSystemWaypoints: (systemSymbol: string, authToken?: AuthToken) =>
    unwrap(
      client.GET("/api/navigation/v1/systems/{systemSymbol}/waypoints", {
        params: { path: { systemSymbol } },
        ...bearer(authToken),
      }),
    ),
  getMarket: (waypointSymbol: string, authToken?: AuthToken) =>
    unwrap(
      client.GET("/api/navigation/v1/waypoints/{symbol}/market", {
        params: { path: { symbol: waypointSymbol } },
        ...bearer(authToken),
      }),
    ),
  getShipyard: (waypointSymbol: string, authToken?: AuthToken) =>
    unwrap(
      client.GET("/api/navigation/v1/waypoints/{symbol}/shipyard", {
        params: { path: { symbol: waypointSymbol } },
        ...bearer(authToken),
      }),
    ),
};
