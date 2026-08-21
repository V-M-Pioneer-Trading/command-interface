import { config } from "./config";
import { request } from "./client";

const base = config.navigationServiceUrl;

// Public: navigation-service serves from its SQLite cache when no
// X-SpaceTraders-Token is present, live (with a fetch-and-store on miss)
// when one is. No Clerk check here — the axis that matters is whether a game
// credential exists to make the upstream call with, not who's asking.
export const navigationService = {
  getWaypoint: (token, symbol) => request(base, `/waypoints/${symbol}`, { token }),
  getSystemWaypoints: (token, systemSymbol) =>
    request(base, `/systems/${systemSymbol}/waypoints`, { token }),
  getMarket: (token, waypointSymbol) =>
    request(base, `/waypoints/${waypointSymbol}/market`, { token }),
  getShipyard: (token, waypointSymbol) =>
    request(base, `/waypoints/${waypointSymbol}/shipyard`, { token }),
};
