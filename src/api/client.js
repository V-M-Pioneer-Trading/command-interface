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

export async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  if (!token) throw new ApiError(401, "No SpaceTraders token set");

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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
