import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

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

/** How often scopes are re-read: about Clerk's session-token lifetime. */
const SCOPE_REFRESH_MS = 60_000;

export const SCOPE_FLEET_CONTROL = "fleet:control";
export const SCOPE_PLANNER_ADVISE = "planner:advise";

/** What a tree with no OperatorProvider sees: a signed-out observer. */
export const ANONYMOUS_OPERATOR = {
  isLoaded: true,
  isSignedIn: false,
  signOut: async () => {},
  getToken: async () => null,
  can: () => false,
};

export const OperatorContext = createContext(ANONYMOUS_OPERATOR);

export function scopesFromToken(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return [];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    const scope = claims.scope;
    if (typeof scope === "string") return scope.split(/\s+/).filter(Boolean);
    if (Array.isArray(scope)) return scope.filter((s) => typeof s === "string");
    return [];
  } catch {
    return [];
  }
}

export function OperatorProvider({ children }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn) {
      setScopes((prev) => (prev.length === 0 ? prev : []));
      return undefined;
    }
    // `getToken()` returns Clerk's cached token or a refreshed one. Keep the
    // previous state when the scope set is unchanged so consumers don't
    // re-render on every poll. A failed refresh keeps the last known scopes.
    const refresh = () =>
      getToken()
        .then((token) => {
          if (cancelled) return;
          const next = scopesFromToken(token).sort();
          setScopes((prev) =>
            prev.length === next.length && prev.every((s, i) => s === next[i]) ? prev : next,
          );
        })
        .catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const timer = setInterval(refresh, SCOPE_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isSignedIn, getToken]);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      signOut,
      /** Fresh token for an authenticated call. Clerk tokens are short-lived,
       *  so this is called per request rather than cached. */
      getToken,
      can: (scope) => scopes.includes(scope),
    }),
    [isLoaded, isSignedIn, signOut, getToken, scopes],
  );

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator() {
  return useContext(OperatorContext);
}
