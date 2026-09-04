import "./QueryState.css";

/**
 * The four answers a panel owes a reader, instead of an empty box.
 *
 * A query that has failed, a query that was never allowed to run (no operator
 * session, no game token) and a feature the deployment doesn't have all used to
 * render as the same thing: nothing at all, or — worse — the panel's "none
 * found" message, which states as fact something nobody checked. `isLoading` is
 * false in every one of those cases, so branching on it alone hid all three.
 *
 * - fetching            → "Loading…"
 * - rejected            → the error, because a stalled panel with no signal is
 *                         indistinguishable from a quiet one
 * - `null` data         → `notConfigured`: the route 404'd, meaning the optional
 *                         backend feature was never enabled here
 * - `undefined` data    → `empty`: the query is disabled, so nothing was asked
 *
 * Anything else is real data and goes to `children`, which is called with it.
 */
export function QueryState({ query, notConfigured, empty, children }) {
  const { isLoading, isError, error, data } = query;

  if (isLoading) return <p className="lcars-query-state">Loading…</p>;
  if (isError) {
    return (
      <p className="lcars-query-state lcars-query-state--error">
        {error?.message || "Request failed"}
      </p>
    );
  }
  if (data === null) {
    return <p className="lcars-query-state lcars-query-state--muted">{notConfigured}</p>;
  }
  if (data === undefined) {
    return <p className="lcars-query-state lcars-query-state--muted">{empty}</p>;
  }
  return children(data);
}
