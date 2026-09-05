import { config } from "./config";
import { request } from "./client";

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
  getWaypoint: (symbol, authToken) => request(base, `/waypoints/${symbol}`, { authToken }),
  getSystemWaypoints: (systemSymbol, authToken) =>
    request(base, `/systems/${systemSymbol}/waypoints`, { authToken }),
  getMarket: (waypointSymbol, authToken) =>
    request(base, `/waypoints/${waypointSymbol}/market`, { authToken }),
  getShipyard: (waypointSymbol, authToken) =>
    request(base, `/waypoints/${waypointSymbol}/shipyard`, { authToken }),
};
