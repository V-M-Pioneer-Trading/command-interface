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
 */
export const queryKeys = {
  systemHealth: () => ["systemHealth"],
  agent: (token) => ["agent", token],
  ships: (token) => ["ships", token],
  contracts: (token) => ["contracts", token],
  systemWaypoints: (token, systemSymbol) => ["systemWaypoints", token, systemSymbol],
  cooldown: (token, shipSymbol) => ["cooldown", token, shipSymbol],
  cargo: (token, shipSymbol) => ["cargo", token, shipSymbol],
  market: (token, waypointSymbol) => ["market", token, waypointSymbol],
  autopilotStatus: () => ["autopilotStatus"],
  shipTask: (shipSymbol) => ["shipTask", shipSymbol],
  metricsContext: (params) => (params ? ["metricsContext", params] : ["metricsContext"]),
  anomaliesDigest: (params) => (params ? ["anomaliesDigest", params] : ["anomaliesDigest"]),
  knobs: () => ["knobs"],
};
