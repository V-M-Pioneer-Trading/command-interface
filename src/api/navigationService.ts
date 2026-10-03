import { config } from "./config";
import { request } from "./client";
import type { Market, Shipyard, SystemWaypointsResponse } from "./types";

// Optional, unlike the other services: the map's own market/shipyard lookups
// go out anonymously.
type AuthToken = string | null | undefined;

const base = config.navigationServiceUrl;

// Public: navigation-service serves from its SQLite cache for anyone, and a
// verified Clerk session extends that to a live fetch-and-store on a miss
// (auth-design.md decisions 2 and 3). The axis is who is asking, not which
// credential they carry — st-gateway supplies the game token upstream
// (decision 5), so a signed-in operator is all navigation-service needs.
//
// The four POST .../refresh routes additionally require the `universe:refresh`
// scope (decision 20) and are not called from this UI.
export const navigationService = {
  getWaypoint: (symbol: string, authToken?: AuthToken) =>
    request<unknown>(base, `/waypoints/${symbol}`, { authToken }),
  getSystemWaypoints: (systemSymbol: string, authToken?: AuthToken) =>
    request<SystemWaypointsResponse>(base, `/systems/${systemSymbol}/waypoints`, { authToken }),
  getMarket: (waypointSymbol: string, authToken?: AuthToken) =>
    request<Market>(base, `/waypoints/${waypointSymbol}/market`, { authToken }),
  getShipyard: (waypointSymbol: string, authToken?: AuthToken) =>
    request<Shipyard>(base, `/waypoints/${waypointSymbol}/shipyard`, { authToken }),
};
