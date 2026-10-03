import { nonEmpty } from "../utils/nonEmpty";
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
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
async function parseErrorMessage(res: Response): Promise<string> {
  try {
    // Boundary: an error body is whatever the server sent, so this shape is a
    // claim narrowed by hand below, not something parsed.
    const body = (await res.json()) as { error?: string | { message?: string } | null; message?: string };
    const error = body.error;
    const message = typeof error === "object" && error !== null ? error.message : error;
    return nonEmpty(message) ?? nonEmpty(body.message) ?? res.statusText;
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
export function readResponse<T>(res: Response, options: { allow404: true }): Promise<T | null>;
export function readResponse<T>(res: Response, options?: { allow404?: boolean }): Promise<T>;
export async function readResponse<T>(
  res: Response,
  { allow404 = false }: { allow404?: boolean } = {},
): Promise<T | null> {
  if (allow404 && res.status === 404) return null;
  if (res.status === 204) return null;
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  // Boundary: the body is not validated, `T` is the caller's claim about it.
  // A 204 yields null above. The non-null overload is only honest for a route
  // that never answers one; fleet-service's cooldown does (a ship with none),
  // so callers of such a route type it `request<T | null>`.
  return (await res.json()) as T;
}

/** Appends only the params that were actually supplied. */
export function withQuery(
  path: string,
  params?: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
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
export interface RequestOptions {
  method?: string;
  authToken?: string | null | undefined;
  body?: unknown;
}

export async function request<T>(
  baseUrl: string,
  path: string,
  { method = "GET", authToken, body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    // null, not undefined: exactOptionalPropertyTypes rejects undefined here,
    // and fetch treats both as "no body".
    body: body ? JSON.stringify(body) : null,
  });

  return readResponse<T>(res);
}
