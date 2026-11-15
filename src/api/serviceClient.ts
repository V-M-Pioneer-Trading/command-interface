import createClient from "openapi-fetch";
import { ApiError, errorMessage } from "./client";

/**
 * Typed client for one backend service, built from its generated `paths`.
 *
 * Spec paths are absolute (`/api/agent/v1/ships`) while the `VITE_*_SERVICE_URL`
 * variables still include the mount, so the base is only the origin of the
 * service URL. A relative URL resolves against the page, so a bad env value
 * cannot throw at module load and blank the app.
 *
 * `fetch` is looked up on every call: openapi-fetch otherwise captures it at
 * creation, and `src/devMap.tsx` replaces `window.fetch` after import.
 * No middleware and no default headers: credentials are per call (`bearer`).
 */
export function serviceClient<P extends object>(serviceUrl: string) {
  return createClient<P>({
    baseUrl: new URL(serviceUrl, globalThis.location.href).origin,
    fetch: (req) => globalThis.fetch(req),
  });
}

/**
 * Per-call options carrying the Clerk session token, spread into a call. The
 * token is never stored in the client, a closure or a cache key.
 */
export function bearer(authToken: string | null | undefined) {
  return authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {};
}

/** openapi-fetch result: either `data` or `error`, always the `response`. */
interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Result → the success body, or a thrown `ApiError(status, message)` with the
 * message read the same way `readResponse` does. Only routes the spec marks
 * nullable (`/ships`, `/contracts`) can return `null`.
 */
export async function unwrap<T>(result: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await result;
  if (!response.ok) throw new ApiError(response.status, errorMessage(error, response.statusText));
  // Boundary: the body is not validated at runtime; the generated type is the
  // spec's claim about it, as `readResponse` does for the hand-written ones.
  return data as T;
}

/**
 * `unwrap` for a route where `absent` is a normal answer, not a failure: a 404
 * for a ship the autopilot isn't managing or an optional feature the operator
 * never enabled, a 204 for a ship with no cooldown. Callers must tell that
 * `null` from `undefined` ("still loading") and from a rejection ("the service
 * is unwell"). The status is explicit at the call site, never derived from the
 * spec; every other non-2xx throws exactly as `unwrap` does. openapi-fetch adds
 * `undefined` to the data of an operation that declares a 204; that is the
 * absent case, so it is excluded from the result.
 */
export async function unwrapOrNull<T>(
  result: Promise<FetchResult<T>>,
  absent: 204 | 404,
): Promise<Exclude<T, undefined> | null> {
  const settled = await result;
  if (settled.response.status === absent) return null;
  // Boundary: a 2xx other than the declared 204 carries a body.
  return (await unwrap(Promise.resolve(settled))) as Exclude<T, undefined>;
}
