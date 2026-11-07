import type { ShipCargo } from "./agentService";

/**
 * Hand-written types for the fleet-, navigation- and automation-service
 * responses this UI reads. agent-service types are generated: see
 * `src/generated/agent-service.ts`, re-exported by name from `agentService.ts`.
 *
 * Deliberately a subset: each interface lists the fields some component or
 * hook actually touches, not everything the service sends. Cross-checked
 * against fleet-service/openapi.json (Survey) and automation-service/src
 * (knobs, autopilot state, event log, anomalies, metrics rollups).
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

// ── automation-service ───────────────────────────────────────────────────

export type AutopilotStatusName = "disarmed" | "armed" | "paused" | "aborted";
export type AutopilotMode = "live" | "shadow";

export interface AutopilotStatus {
  status: AutopilotStatusName;
  mode: AutopilotMode | null;
}

export interface ShipTask {
  taskKind: "mining" | "contract" | "scout";
  phase: string;
}

export interface EventLogEntry {
  id: string;
  occurredAt: string;
  type: string;
  detail: Record<string, unknown>;
}

export interface MetricsRollup {
  creditsPerHour: number;
  windowEnd: string;
}

export interface MetricsContext {
  rollups: MetricsRollup[];
  events: EventLogEntry[];
}

export interface Anomaly {
  id: string;
  type: string;
  detectedAt: string;
  detail: Record<string, unknown>;
  deliveredAt: string | null;
  deliveryAttempts: number;
}

export interface AnomaliesDigest {
  anomalies: Anomaly[];
  events: EventLogEntry[];
}

export type KnobClass = "model" | "policy" | "alert";

export interface Knob {
  name: string;
  value: number;
  min: number;
  max: number;
  default: number;
  /** Absent on an older automation-service; the UI treats that as "policy". */
  class?: KnobClass;
  description?: string;
}

// ── health ───────────────────────────────────────────────────────────────

export type ServiceStatus = "up" | "down";

// ── query parameters ─────────────────────────────────────────────────────

export interface MetricsContextParams {
  rollupLimit?: number;
  eventLimit?: number;
}

export interface AnomaliesDigestParams {
  windowMinutes?: number;
  anomalyLimit?: number;
  eventLimit?: number;
}
