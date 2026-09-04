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
 *    query hooks). It now runs once per session token, here.
 */

export const SCOPE_FLEET_CONTROL = "fleet:control";

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
      setScopes([]);
      return undefined;
    }
    getToken()
      .then((token) => {
        if (!cancelled) setScopes(scopesFromToken(token));
      })
      .catch(() => {
        if (!cancelled) setScopes([]);
      });
    return () => {
      cancelled = true;
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
