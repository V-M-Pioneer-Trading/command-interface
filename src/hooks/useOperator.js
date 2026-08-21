import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

/**
 * The signed-in operator's permissions, for deciding what the UI offers.
 *
 * Scopes are read by decoding the session token client-side, which is
 * **optimistic and unverified** — exactly like the old Google flow's claim
 * parsing. It decides whether a control renders enabled, nothing more. Every
 * gated route in automation-service verifies the signature and the scope
 * itself, so a user who edits this bundle to re-enable a button gets a 403 from
 * the server rather than an armed autopilot.
 *
 * Decoded rather than read from a Clerk hook property so this does not depend
 * on where in the SDK's surface `sessionClaims` happens to live.
 */
export const SCOPE_FLEET_CONTROL = "fleet:control";
export const SCOPE_AGENT_RESET = "agent:reset";

function scopesFromToken(token) {
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

export function useOperator() {
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

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    signOut,
    /** Fresh token for an authenticated call. Clerk tokens are short-lived, so
     *  this is called per request rather than cached. */
    getToken,
    can: (scope) => scopes.includes(scope),
  };
}
