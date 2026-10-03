import { createContext, useContext } from "react";

/**
 * The signed-in operator's identity and permissions, for deciding what the UI
 * offers.
 *
 * Scopes are read by decoding the Clerk session token client-side, which is
 * **optimistic and unverified**. It decides whether a control renders enabled,
 * nothing more. Every gated route verifies the signature and the scope itself,
 * so a user who edits this bundle to re-enable a button gets a 403 from the
 * server rather than an armed autopilot.
 *
 * This is a context rather than a bare hook for two reasons:
 *
 * 1. Clerk's `useAuth` **throws** outside a `<ClerkProvider>`. With the hook
 *    calling it directly, every consumer inherited that — and the dev map
 *    harness, which deliberately runs with no Clerk instance, crashed on
 *    render. The default context value below is the anonymous observer, so a
 *    tree with no provider degrades to "signed out" instead of white-screening.
 * 2. The token decode ran once per consumer (eleven of them, counting the
 *    query hooks). It now runs once, here, and re-runs every minute and on
 *    window focus so scope changes in Clerk metadata reach an open tab
 *    without a reload.
 */

export const SCOPE_FLEET_CONTROL = "fleet:control";
export const SCOPE_PLANNER_ADVISE = "planner:advise";

/** What a tree with no OperatorProvider sees: a signed-out observer. */
export interface Operator {
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  /** Fresh session token, or null when signed out. */
  getToken: () => Promise<string | null>;
  can: (scope: string) => boolean;
}

export const ANONYMOUS_OPERATOR: Operator = {
  isLoaded: true,
  isSignedIn: false,
  signOut: () => Promise.resolve(),
  getToken: () => Promise.resolve(null),
  can: () => false,
};

export const OperatorContext = createContext<Operator>(ANONYMOUS_OPERATOR);

export function scopesFromToken(token: string | null | undefined): string[] {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return [];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    // Boundary: unverified JSON from the token, narrowed by hand below.
    const claims = JSON.parse(atob(padded)) as { scope?: unknown };
    const scope = claims.scope;
    if (typeof scope === "string") return scope.split(/\s+/).filter(Boolean);
    if (Array.isArray(scope)) return scope.filter((s): s is string => typeof s === "string");
    return [];
  } catch {
    return [];
  }
}

export function useOperator() {
  return useContext(OperatorContext);
}
