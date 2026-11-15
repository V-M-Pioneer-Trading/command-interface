import { config } from "./config";
import { bearer, serviceClient, unwrap, unwrapOrNull, type AuthToken } from "./serviceClient";
import type { components, paths } from "../generated/automation-service";

// Types keep the spec's schema names. Call sites import them from here.
type Schemas = components["schemas"];
export type AutopilotSnapshot = Schemas["AutopilotSnapshot"];
export type AutopilotStatus = Schemas["AutopilotStatus"];
export type AutopilotMode = Schemas["AutopilotMode"];
export type ShipTask = Schemas["ShipTask"];
export type Knob = Schemas["Knob"];
export type KnobClass = Schemas["KnobClass"];
export type EventLogEntry = Schemas["EventLogEntry"];
export type MetricsRollup = Schemas["MetricsRollup"];
export type Anomaly = Schemas["Anomaly"];

// The spec types these query params as strings (they travel in a URL); callers
// pass numbers, and so do the query keys, so numbers are kept at this boundary.
export interface MetricsContextParams {
  rollupLimit?: number;
  eventLimit?: number;
}

export interface AnomaliesDigestParams {
  windowMinutes?: number;
  anomalyLimit?: number;
  eventLimit?: number;
}

/** Only the params that were supplied, as the strings the spec declares. */
function query<K extends string>(params: Partial<Record<K, number | undefined>>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(params) as K[]) {
    const value = params[key];
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

const client = serviceClient<paths>(config.automationServiceUrl);

// Reads are public: the observability surface — status, event log, metrics,
// knob values, per-ship task state — is meant to be watchable without
// credentials. Mutating calls carry a **Clerk** session token, not the
// SpaceTraders one: automation-service verifies it through auth-service and requires the
// `fleet:control` scope (autopilot arm/pause/abort), or `planner:advise` for
// `PUT /planner/knobs/:name`.
//
// The Clerk token is passed in per call rather than held here, because Clerk
// tokens are short-lived and refreshed by the SDK; caching one in this module
// would mean sending a stale token the moment it expires.
//
// An unauthenticated GET here sends **no headers
// at all**: no `bearer`, and serviceClient has no default headers (openapi-fetch
// adds Content-Type only when there is a body, and never Accept). That keeps it
// a CORS-simple request with no preflight, which is what the public read
// surface relies on — do not add a blanket custom header to this path without
// checking automation-service's allowed-headers list.
export const automationService = {
  getStatus: () => unwrap(client.GET("/api/automation/v1/autopilot/status")),
  // No credential in the body: st-gateway injects the game token on every
  // upstream call (auth-design.md decision 5), so arming is a statement of
  // intent and the Clerk session in the header is what proves you may make it.
  arm: (mode: AutopilotMode = "live", authToken: AuthToken) =>
    unwrap(client.POST("/api/automation/v1/autopilot/arm", { body: { mode }, ...bearer(authToken) })),
  pause: (authToken: AuthToken) => unwrap(client.POST("/api/automation/v1/autopilot/pause", bearer(authToken))),
  abort: (authToken: AuthToken) => unwrap(client.POST("/api/automation/v1/autopilot/abort", bearer(authToken))),
  // A ship with no autopilot task yet (or one automation-service isn't
  // configured to manage) 404s — that's a normal "not managed" state here,
  // not an error worth surfacing.
  getShipTask: async (shipSymbol: string) => {
    const body = await unwrapOrNull(
      client.GET("/api/automation/v1/autopilot/ships/{shipSymbol}", { params: { path: { shipSymbol } } }),
      404,
    );
    return body ? body.task : null;
  },
  // Both routes below only exist if the operator configured the relevant
  // scheduler (metricsRollupIntervalMs / an anomaly webhook) — otherwise
  // automation-service never registers them and a call 404s. That's a normal
  // "feature not enabled on this deployment" state here, not an error.
  getMetricsContext: ({ rollupLimit, eventLimit }: MetricsContextParams = {}) =>
    unwrapOrNull(
      client.GET("/api/automation/v1/metrics/context", { params: { query: query({ rollupLimit, eventLimit }) } }),
      404,
    ),
  getAnomaliesDigest: ({ windowMinutes, anomalyLimit, eventLimit }: AnomaliesDigestParams = {}) =>
    unwrapOrNull(
      client.GET("/api/automation/v1/anomalies/digest", {
        params: { query: query({ windowMinutes, anomalyLimit, eventLimit }) },
      }),
      404,
    ),
  // Unlike metrics/anomalies, the knob API always exists — no operator config
  // gates it, so a call here never 404s for "feature not enabled."
  getKnobs: async () => (await unwrap(client.GET("/api/automation/v1/planner/knobs"))).knobs,
  setKnob: async (name: string, value: number, authToken: AuthToken) =>
    (
      await unwrap(
        client.PUT("/api/automation/v1/planner/knobs/{name}", {
          params: { path: { name } },
          body: { value },
          ...bearer(authToken),
        }),
      )
    ).knob,
};
