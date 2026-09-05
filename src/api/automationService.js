import { config } from "./config";
import { ApiError } from "./client";

const base = config.automationServiceUrl;

// automation-service's error body nests the message ({ error: { message } })
// rather than the flat string/message shape client.js's own parser expects,
// so this can't share that helper directly — but the status code still
// belongs on ApiError so callers can distinguish e.g. a 409 InvalidTransition
// (pause/abort from the wrong state) from a generic failure.
async function parseErrorMessage(res) {
  try {
    const body = await res.json();
    return body.error?.message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

// Reads are public: the observability surface — status, event log, metrics,
// knob values, per-ship task state — is meant to be watchable without
// credentials. Mutating calls carry a **Clerk** session token, not the
// SpaceTraders one: automation-service verifies it locally and requires the
// `fleet:control` scope.
//
// The Clerk token is passed in per call rather than held here, because Clerk
// tokens are short-lived and refreshed by the SDK; caching one in this module
// would mean sending a stale token the moment it expires.
async function call(path, { method = "GET", body, authToken } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json();
}

export const automationService = {
  getStatus: () => call("/autopilot/status"),
  // Arming carries no credential: st-gateway injects the game token on every
  // upstream call (auth-design.md decision 5), so the body is `{ mode }` and
  // the Clerk session in the header is the only thing that proves you may arm.
  arm: (mode = "live", authToken) => call("/autopilot/arm", { method: "POST", body: { mode }, authToken }),
  pause: (authToken) => call("/autopilot/pause", { method: "POST", authToken }),
  abort: (authToken) => call("/autopilot/abort", { method: "POST", authToken }),
  // A ship with no autopilot task yet (or one automation-service isn't
  // configured to manage) 404s — that's a normal "not managed" state here,
  // not an error worth surfacing.
  getShipTask: async (shipSymbol) => {
    const res = await fetch(`${base}/autopilot/ships/${shipSymbol}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
    const body = await res.json();
    return body.task;
  },
  // Both routes below only exist if the operator configured the relevant
  // scheduler (metricsRollupIntervalMs / an anomaly webhook) — otherwise
  // automation-service never registers them and a call 404s. That's a normal
  // "feature not enabled on this deployment" state here, not an error.
  getMetricsContext: async ({ rollupLimit, eventLimit } = {}) => {
    const params = new URLSearchParams();
    if (rollupLimit) params.set("rollupLimit", rollupLimit);
    if (eventLimit) params.set("eventLimit", eventLimit);
    const qs = params.toString();
    const res = await fetch(`${base}/metrics/context${qs ? `?${qs}` : ""}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
    return res.json();
  },
  getAnomaliesDigest: async ({ windowMinutes, anomalyLimit, eventLimit } = {}) => {
    const params = new URLSearchParams();
    if (windowMinutes) params.set("windowMinutes", windowMinutes);
    if (anomalyLimit) params.set("anomalyLimit", anomalyLimit);
    if (eventLimit) params.set("eventLimit", eventLimit);
    const qs = params.toString();
    const res = await fetch(`${base}/anomalies/digest${qs ? `?${qs}` : ""}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
    return res.json();
  },
  // Unlike metrics/anomalies, the knob API always exists — no operator config
  // gates it, so a call here never 404s for "feature not enabled."
  getKnobs: async () => (await call("/planner/knobs")).knobs,
  setKnob: async (name, value, authToken) =>
    (await call(`/planner/knobs/${name}`, { method: "PUT", body: { value }, authToken })).knob,
};
