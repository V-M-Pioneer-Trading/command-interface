import { config } from "./config";
import { request } from "./client";

const base = config.navigationServiceUrl;

export const navigationService = {
  getWaypoint: (token, symbol) => request(base, `/waypoints/${symbol}`, { token }),
  getSystemWaypoints: (token, systemSymbol) =>
    request(base, `/systems/${systemSymbol}/waypoints`, { token }),
  getMarket: (token, waypointSymbol) =>
    request(base, `/waypoints/${waypointSymbol}/market`, { token }),
  getShipyard: (token, waypointSymbol) =>
    request(base, `/waypoints/${waypointSymbol}/shipyard`, { token }),
};
