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

// automation-service's own admin API is unauthenticated (it holds the
// SpaceTraders token in memory after /autopilot/arm, keyed by nothing but
// process lifetime) — unlike agent/navigation/fleet-service, no bearer token
// is forwarded on these calls.
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json();
}

export const automationService = {
  getStatus: () => call("/autopilot/status"),
  arm: (token, mode = "live") => call("/autopilot/arm", { method: "POST", body: { token, mode } }),
  pause: () => call("/autopilot/pause", { method: "POST" }),
  abort: () => call("/autopilot/abort", { method: "POST" }),
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
};
