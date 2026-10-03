import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { OperatorContext, scopesFromToken } from "./OperatorContext";

/** How often scopes are re-read: about Clerk's session-token lifetime. */
const SCOPE_REFRESH_MS = 60_000;

export function OperatorProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const [scopes, setScopes] = useState<string[]>([]);

  // Signing out forgets the scopes, so the next account to sign in never
  // inherits this one's before its own token has been read. Done while
  // rendering rather than in an effect: React re-renders at once with the
  // cleared state, so no committed render pairs the new session with old scopes.
  const [wasSignedIn, setWasSignedIn] = useState(Boolean(isSignedIn));
  if (Boolean(isSignedIn) !== wasSignedIn) {
    setWasSignedIn(Boolean(isSignedIn));
    if (!isSignedIn) setScopes([]);
  }

  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn) return undefined;
    // `getToken()` returns Clerk's cached token or a refreshed one. Keep the
    // previous state when the scope set is unchanged so consumers don't
    // re-render on every poll. A failed refresh keeps the last known scopes.
    const refresh = () => {
      getToken()
        .then((token) => {
          if (cancelled) return;
          const next = scopesFromToken(token).sort();
          setScopes((prev) =>
            prev.length === next.length && prev.every((s, i) => s === next[i]) ? prev : next,
          );
        })
        .catch(() => undefined);
    };
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
      can: (scope: string) => Boolean(isSignedIn) && scopes.includes(scope),
    }),
    [isLoaded, isSignedIn, signOut, getToken, scopes],
  );

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}
