import { config } from "./config";
import { readResponse, withQuery } from "./client";

const base = config.automationServiceUrl;

// Reads are public: the observability surface — status, event log, metrics,
// knob values, per-ship task state — is meant to be watchable without
// credentials. Mutating calls carry a **Clerk** session token, not the
// SpaceTraders one: automation-service verifies it locally and requires the
// `fleet:control` scope.
//
// The Clerk token is passed in per call rather than held here, because Clerk
// tokens are short-lived and refreshed by the SDK; caching one in this module
// would mean sending a stale token the moment it expires.
//
// Unlike client.js's `request`, an unauthenticated GET here sends **no headers
// at all**. That keeps it a CORS-simple request with no preflight, which is
// what the public read surface relies on — do not add a blanket custom header
// to this path without checking automation-service's allowed-headers list.
async function call(path, { method = "GET", body, authToken, allow404 = false } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return readResponse(res, { allow404 });
}

export const automationService = {
  getStatus: () => call("/autopilot/status"),
  // `token` is the SpaceTraders credential automation-service will fly with;
  // `authToken` is the Clerk session proving you may arm at all. Two different
  // secrets doing two different jobs — the first goes in the body, the second
  // in the header. The first disappears in increment 3, when st-gateway starts
  // injecting the game token and arming becomes `{ mode }` alone.
  arm: (token, mode = "live", authToken) =>
    call("/autopilot/arm", { method: "POST", body: { token, mode }, authToken }),
  pause: (authToken) => call("/autopilot/pause", { method: "POST", authToken }),
  abort: (authToken) => call("/autopilot/abort", { method: "POST", authToken }),
  // A ship with no autopilot task yet (or one automation-service isn't
  // configured to manage) 404s — that's a normal "not managed" state here,
  // not an error worth surfacing.
  getShipTask: async (shipSymbol) => {
    const body = await call(`/autopilot/ships/${shipSymbol}`, { allow404: true });
    return body ? body.task : null;
  },
  // Both routes below only exist if the operator configured the relevant
  // scheduler (metricsRollupIntervalMs / an anomaly webhook) — otherwise
  // automation-service never registers them and a call 404s. That's a normal
  // "feature not enabled on this deployment" state here, not an error.
  getMetricsContext: ({ rollupLimit, eventLimit } = {}) =>
    call(withQuery("/metrics/context", { rollupLimit, eventLimit }), { allow404: true }),
  getAnomaliesDigest: ({ windowMinutes, anomalyLimit, eventLimit } = {}) =>
    call(withQuery("/anomalies/digest", { windowMinutes, anomalyLimit, eventLimit }), {
      allow404: true,
    }),
  // Unlike metrics/anomalies, the knob API always exists — no operator config
  // gates it, so a call here never 404s for "feature not enabled."
  getKnobs: async () => (await call("/planner/knobs")).knobs,
  setKnob: async (name, value, authToken) =>
    (await call(`/planner/knobs/${name}`, { method: "PUT", body: { value }, authToken })).knob,
};
