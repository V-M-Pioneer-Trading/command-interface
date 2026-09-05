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

// One credential: `authToken`, the operator's Clerk session. The backends
// verify it locally and forward it to st-gateway, which injects the game token
// (auth-design.md decision 5) and derives queue priority from the session it
// just verified (decision 2) — so a human operator's traffic reaches the
// interactive lane without this app asserting anything about itself.
//
// No `X-Priority`: the gateway ignores what a caller declares, which is the
// point. No `X-SpaceTraders-Token`: the game credential never enters the
// browser at all.
//
// `authToken` is optional. A call without it gets whatever the server gives an
// anonymous caller — navigation-service's cache, automation-service's public
// observability surface — rather than this client refusing to try.
export async function request(baseUrl, path, { method = "GET", authToken, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },

    body: body ? JSON.stringify(body) : undefined,
  });

  return readResponse(res);
}
