/**
 * Hand-written types for the navigation-service responses this UI reads.
 * agent-, automation- and fleet-service types are generated
 * (`src/generated/<service>.ts`), re-exported by name from `agentService.ts`,
 * `automationService.ts` and `fleetService.ts`.
 *
 * Deliberately a subset: each interface lists the fields some component or
 * hook actually touches, not everything the service sends.
 * navigation-service documents its bodies as free-form JSON, so Waypoint,
 * Market, Shipyard and the `{ data }` envelopes are the SpaceTraders shape as
 * CLAUDE.md records it. No codegen for it yet: keep them in step with the
 * service by hand until its slice lands.
 */

// ── navigation-service ───────────────────────────────────────────────────

export interface WaypointTrait {
  symbol: string;
}

export interface Waypoint {
  symbol: string;
  type: string;
  x: number;
  y: number;
  orbits?: string;
  traits?: WaypointTrait[];
  isUnderConstruction?: boolean;
}

export interface SystemWaypointsResponse {
  data?: Waypoint[];
}

export interface MarketTradeGood {
  symbol: string;
  purchasePrice: number;
  sellPrice: number;
}

/** `GET /waypoints/:symbol/market`. */
export interface Market {
  tradeGoods?: MarketTradeGood[];
}

/** `GET /waypoints/:symbol/shipyard`. */
export interface Shipyard {
  shipTypes?: { type: string }[];
  /** Priced listings; only present while one of our ships is docked there. */
  ships?: { type: string; purchasePrice: number }[];
}

// ── health ───────────────────────────────────────────────────────────────

export type ServiceStatus = "up" | "down";
