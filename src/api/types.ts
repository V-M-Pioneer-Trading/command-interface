/**
 * Hand-written types for the backend responses this UI reads.
 *
 * Deliberately a subset: each interface lists the fields some component or
 * hook actually touches, not everything the service sends. Cross-checked
 * against agent-service/ts/openapi.json (Agent, Ship, Contract, ShipCooldown),
 * fleet-service/openapi.json (Survey) and automation-service/POC.md (autopilot
 * row, event log). navigation-service
 * and fleet-service document their bodies as free-form JSON, so Waypoint,
 * Market, Shipyard and the `{ data }` envelopes are the SpaceTraders shape as
 * CLAUDE.md records it. No codegen: keep these in step with the services by
 * hand.
 */

// ── agent-service ────────────────────────────────────────────────────────

/** `GET /agent` — flat, not wrapped in `{ data }`. */
export interface Agent {
  symbol: string;
  credits: number;
  startingFaction: string;
  shipCount: number;
  headquarters: string;
}

export interface ShipRouteWaypoint {
  symbol: string;
}

export interface ShipRoute {
  origin: ShipRouteWaypoint;
  destination: ShipRouteWaypoint;
  departureTime: string;
  arrival: string;
}

export interface ShipNav {
  systemSymbol: string;
  waypointSymbol: string;
  /** DOCKED | IN_ORBIT | IN_TRANSIT upstream; the spec types it as a string. */
  status: string;
  flightMode: string;
  route: ShipRoute;
}

export interface CargoItem {
  symbol: string;
  units: number;
}

export interface ShipCargo {
  capacity: number;
  units: number;
  /** agent-service sends `null` for a hold with no list, `[]` for an empty one. */
  inventory: CargoItem[] | null;
}

export interface Ship {
  symbol: string;
  registration: { role: string };
  nav: ShipNav;
  frame: { symbol: string; name: string };
  fuel: { current: number; capacity: number };
  cargo: ShipCargo;
}

export interface ContractDeliverGood {
  tradeSymbol: string;
  destinationSymbol: string;
  unitsRequired: number;
  unitsFulfilled: number;
}

export interface Contract {
  id: string;
  type: string;
  accepted: boolean;
  fulfilled: boolean;
  terms: {
    payment: { onAccepted: number; onFulfilled: number };
    /** SpaceTraders marks it optional, and agent-service sends `null` for a contract with nothing to deliver. */
    deliver: ContractDeliverGood[] | null;
  };
}

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

// ── automation-service ───────────────────────────────────────────────────

/** `GET /autopilot/status` — the single autopilot row. */
export interface AutopilotStatus {
  status: "disarmed" | "armed" | "paused";
  shipSymbol: string;
  phase: string;
  asteroid: string | null;
  market: string | null;
  waitingUntil: string | null;
  updatedAt: string;
}

export interface EventLogEntry {
  id: string;
  occurredAt: string;
  type: string;
  detail: Record<string, unknown>;
}

// ── health ───────────────────────────────────────────────────────────────

export type ServiceStatus = "up" | "down";
