import { useMemo } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

/**
 * The one credential this app holds: the operator's Clerk session.
 *
 * There is no SpaceTraders token anywhere in the browser any more. st-gateway
 * injects the fleet's agent token on every upstream call (auth-design.md
 * decision 5), so the backends need to know *who is asking*, never *which
 * agent* — and that is what a Clerk session says.
 *
 * `token` is an opaque handle rather than a string, deliberately: Clerk
 * session tokens are short-lived and rotated by the SDK, so `request()` asks
 * `getToken()` for a fresh one per call instead of caching a value that would
 * expire mid-session. The handle carries the stable user id so it can sit in
 * a TanStack Query key — signing out or switching operator changes the key,
 * a token rotation does not.
 *
 * `token` is `null` for a visitor. Reads that navigation-service serves from
 * cache still work anonymously (decision 3); reads about the fleet itself
 * (agent, ships, contracts) need a session, so their queries gate on it.
 */
export function useAuth() {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();

  const token = useMemo(
    () => (isLoaded && isSignedIn && userId ? { id: userId, getToken } : null),
    [isLoaded, isSignedIn, userId, getToken]
  );

  return { token, logout: () => signOut() };
}
