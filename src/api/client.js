export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(res) {
  try {
    const body = await res.json();
    return body.error || body.message || res.statusText;
  } catch {
    return res.statusText;
  }
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

  if (res.status === 204) return null;

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return res.json();
}
