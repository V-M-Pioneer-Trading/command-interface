/**
 * Every TanStack Query cache key in one place.
 *
 * These are the identifiers components invalidate after a mutation, so a key
 * written out by hand in a component and a key written out by hand in
 * `queries.ts` are two chances to disagree — and a disagreement here fails
 * silently, as a panel that just never refreshes.
 *
 * Called with no arguments a key function returns its prefix, which is what
 * `invalidateQueries` matches on when the exact parameters aren't known at the
 * call site.
 *
 * Keys carry no credential. They used to be seeded with the pasted game token
 * so that changing it refetched everything; the Clerk session that replaced it
 * rotates on its own schedule, and keying on a rotating value would evict the
 * whole cache several times an hour. Signing out clears it explicitly instead.

 */

/** Signed-out or not-yet-known symbols are passed through as-is, as before. */
type SymbolArg = string | null | undefined;

export const queryKeys = {
  systemHealth: () => ["systemHealth"] as const,
  agent: () => ["agent"] as const,
  ships: () => ["ships"] as const,
  contracts: () => ["contracts"] as const,
  systemWaypoints: (systemSymbol: SymbolArg) => ["systemWaypoints", systemSymbol] as const,
  cooldown: (shipSymbol: SymbolArg) => ["cooldown", shipSymbol] as const,
  cargo: (shipSymbol: SymbolArg) => ["cargo", shipSymbol] as const,
  market: (waypointSymbol: SymbolArg) => ["market", waypointSymbol] as const,

  autopilotStatus: () => ["autopilotStatus"] as const,
  autopilotEvents: (limit?: number) =>
    limit === undefined ? (["autopilotEvents"] as const) : (["autopilotEvents", limit] as const),
};
