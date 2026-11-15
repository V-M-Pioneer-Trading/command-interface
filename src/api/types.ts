import type { ShipCargo } from "./agentService";

/**
 * Hand-written types for the fleet- and navigation-service responses this UI
 * reads. agent-service and automation-service types are generated
 * (`src/generated/<service>.ts`), re-exported by name from `agentService.ts`
 * and `automationService.ts`.
 *
 * Deliberately a subset: each interface lists the fields some component or
 * hook actually touches, not everything the service sends. Cross-checked
 * against fleet-service/openapi.json (Survey).
 * navigation-service and fleet-service document their bodies as free-form
 * JSON, so Waypoint, Market, Shipyard and the `{ data }` envelopes are the
 * SpaceTraders shape as CLAUDE.md records it. No codegen for these yet: keep
 * them in step with the services by hand until their slices land.
 */

// ── fleet-service ────────────────────────────────────────────────────────
// Upstream SpaceTraders bodies, passed through inside `{ data }`.

export interface CooldownResponse {
  data: { shipSymbol: string; totalSeconds: number; remainingSeconds: number; expiration?: string };
}

// The `{ data }` envelopes below are free-form upstream bodies that fleet-service
// and navigation-service pass through without a schema, so every level the UI
// reads past the top is optional: the code already tolerates a body without it,
// and the types say so instead of claiming a shape nobody checks.
export interface CargoResponse {
  data?: ShipCargo;
}

export interface RefuelResponse {
  data?: { transaction?: { units?: number } };
}

export interface SurveyDeposit {
  symbol: string;
}

export interface Survey {
  signature: string;
  symbol: string;
  deposits: SurveyDeposit[];
  expiration: string;
  size: "SMALL" | "MODERATE" | "LARGE";
}

export interface SurveyResponse {
  data?: { surveys?: Survey[] };
}

/** Mutations whose response body the UI never reads. */
export type ShipActionResponse = Record<string, unknown>;

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
