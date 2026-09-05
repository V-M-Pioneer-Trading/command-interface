export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(res) {
  try {
    const body = await res.json();
    // Every backend answers auth failures with { error: { message } }; the
    // older flat shapes are still seen on validation and upstream errors.
    return body.error?.message || body.error || body.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

/**
 * One call to agent/fleet/navigation-service.
 *
 * `token` is the operator handle from `useAuth()` — `{ id, getToken }` — or
 * `null` for an anonymous visitor. A fresh Clerk session token is fetched per
 * call because they rotate; it goes out as `Authorization` and is the only
 * credential this app ever sends. The backends verify it locally, and forward
 * it to st-gateway, which derives queue priority from it (a human session
 * earns the interactive lane — auth-design.md decision 2). No `X-Priority`:
 * the gateway ignores it, and nothing a browser declares about itself should
 * be able to jump a queue.
 *
 * Anonymous calls are sent without the header rather than refused here: what
 * a visitor may read is each backend's decision (decision 3), not this
 * client's.
 */
export async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  const sessionToken = token ? await token.getToken() : null;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
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
