import { config } from "./config";
import { readResponse, withQuery } from "./client";
import type { AutopilotStatus, EventLogEntry } from "./types";

const base = config.automationServiceUrl;

// Reads are public: status and event log are meant to be watchable without
// credentials. Mutating calls carry a **Clerk** session token, not the
// SpaceTraders one: automation-service verifies it through auth-service and
// requires the `fleet:control` scope (autopilot arm/pause).
//
// The Clerk token is passed in per call rather than held here, because Clerk
// tokens are short-lived and refreshed by the SDK; caching one in this module
// would mean sending a stale token the moment it expires.
//
// Unlike client.ts's `request`, an unauthenticated GET here sends **no headers
// at all**. That keeps it a CORS-simple request with no preflight, which is
// what the public read surface relies on — do not add a blanket custom header
// to this path without checking automation-service's allowed-headers list.
async function call<T>(path: string, { method = "GET", authToken }: { method?: string; authToken?: string | null } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    // Spread rather than `headers: undefined`: exactOptionalPropertyTypes
    // rejects an explicit undefined, and the key must be absent entirely for
    // the request to stay CORS-simple.
    ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
  });
  return readResponse<T>(res);
}

export const automationService = {
  getStatus: () => call<AutopilotStatus>("/autopilot/status"),
  getEvents: async (limit?: number) =>
    (await call<{ events: EventLogEntry[] }>(withQuery("/autopilot/events", { limit }))).events,
  // No credential in the body: st-gateway injects the game token on every
  // upstream call (auth-design.md decision 5), so arming is a statement of
  // intent and the Clerk session in the header is what proves you may make it.
  arm: (authToken: string | null) => call<AutopilotStatus>("/autopilot/arm", { method: "POST", authToken }),
  pause: (authToken: string | null) => call<AutopilotStatus>("/autopilot/pause", { method: "POST", authToken }),
};
