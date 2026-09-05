/**
 * Every TanStack Query cache key in one place.
 *
 * These are the identifiers components invalidate after a mutation, so a key
 * written out by hand in a component and a key written out by hand in
 * `queries.js` are two chances to disagree — and a disagreement here fails
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
export const queryKeys = {
  systemHealth: () => ["systemHealth"],
  agent: () => ["agent"],
  ships: () => ["ships"],
  contracts: () => ["contracts"],
  systemWaypoints: (systemSymbol) => ["systemWaypoints", systemSymbol],
  cooldown: (shipSymbol) => ["cooldown", shipSymbol],
  cargo: (shipSymbol) => ["cargo", shipSymbol],
  market: (waypointSymbol) => ["market", waypointSymbol],

  autopilotStatus: () => ["autopilotStatus"],
  shipTask: (shipSymbol) => ["shipTask", shipSymbol],
  metricsContext: (params) => (params ? ["metricsContext", params] : ["metricsContext"]),
  anomaliesDigest: (params) => (params ? ["anomaliesDigest", params] : ["anomaliesDigest"]),
  knobs: () => ["knobs"],
};
