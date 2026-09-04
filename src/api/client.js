export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * The backends disagree about error-body shape: agent/navigation/fleet return
 * a flat `{ error }` or `{ message }`, automation-service nests it as
 * `{ error: { message } }`. Both are handled here so every client in this
 * directory raises the same `ApiError` — previously automation-service had to
 * carry a second copy of this function for the nested case alone.
 */
async function parseErrorMessage(res) {
  try {
    const body = await res.json();
    const nested = typeof body.error === "object" && body.error !== null;
    return (nested ? body.error.message : body.error) || body.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

/**
 * Response → parsed body, or a thrown `ApiError`.
 *
 * `allow404` turns a 404 into `null` for routes where "absent" is a normal
 * answer rather than a failure: a ship automation-service isn't managing, or
 * an optional feature (metrics rollups, anomaly detection) the operator never
 * enabled. Callers must distinguish that `null` from `undefined` ("still
 * loading") and from a rejection ("the service is unwell") — all three mean
 * different things on screen.
 */
export async function readResponse(res, { allow404 = false } = {}) {
  if (allow404 && res.status === 404) return null;
  if (res.status === 204) return null;
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json();
}

/** Appends only the params that were actually supplied. */
export function withQuery(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

// Two different credentials travel on two different headers (auth-design.md
// decision 18). `Authorization` is always the Clerk session — the identity
// nav/agent/fleet-service gate on. `X-SpaceTraders-Token` is the pasted game
// credential, still needed for the live upstream call until auth-service and
// st-gateway injection remove it from the browser entirely. Neither is
// required client-side: a call missing one simply gets whatever response the
// server gives an unauthenticated or uncredentialed caller, rather than the
// client refusing to even try.
export async function request(baseUrl, path, { method = "GET", token, authToken, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { "X-SpaceTraders-Token": token } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      // Every call from this UI is a user-initiated action — propagated by
      // fleet/agent/navigation-service all the way to st-gateway's priority
      // queue so browser traffic stays responsive alongside automation-service's
      // background autopilot traffic (meta#37).
      "X-Priority": "interactive",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return readResponse(res);
}
