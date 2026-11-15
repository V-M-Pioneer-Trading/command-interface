import { nonEmpty } from "../utils/nonEmpty";
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * The backends disagree about error-body shape: agent/fleet return a flat
 * `{ error }` or `{ message }`, automation-service nests it as
 * `{ error: { message } }`, navigation-service sends Spring ProblemDetail
 * `{ type, title, status, detail }` (not read: it falls back to `statusText`)
 * or no body at all. Both are handled here so every client in this
 * directory raises the same `ApiError` — previously automation-service had to
 * carry a second copy of this function for the nested case alone.
 *
 * Takes the already-parsed body (openapi-fetch has consumed it). Anything that
 * is not an object with a usable message falls back to `statusText`: a null or
 * empty body, a non-JSON text body, an array.
 */
export function errorMessage(body: unknown, statusText: string): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return statusText;
  // Boundary: an error body is whatever the server sent, so this shape is a
  // claim narrowed by hand below, not something parsed.
  const { error, message } = body as { error?: unknown; message?: unknown };
  const nested = typeof error === "object" && error !== null ? (error as { message?: unknown }).message : error;
  return (
    nonEmpty(typeof nested === "string" ? nested : undefined) ??
    nonEmpty(typeof message === "string" ? message : undefined) ??
    statusText
  );
}
