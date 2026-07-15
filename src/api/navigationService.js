import { config } from "./config";
import { request } from "./client";

const base = config.navigationServiceUrl;

export const navigationService = {
  getWaypoint: (token, symbol) => request(base, `/api/v1/waypoints/${symbol}`, { token }),
  getSystemWaypoints: (token, systemSymbol) =>
    request(base, `/api/v1/systems/${systemSymbol}/waypoints`, { token }),
  getMarket: (token, waypointSymbol) =>
    request(base, `/api/v1/waypoints/${waypointSymbol}/market`, { token }),
  getShipyard: (token, waypointSymbol) =>
    request(base, `/api/v1/waypoints/${waypointSymbol}/shipyard`, { token }),
};
