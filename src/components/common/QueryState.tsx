import type { ReactNode } from "react";
import "./QueryState.css";
import { nonEmpty } from "../../utils/nonEmpty";

/**
 * The slice of react-query's result this component reads. Structural, so a
 * real `UseQueryResult` fits and a test can pass just the fields it cares about.
 */
export interface QueryStateSource<T> {
  isLoading?: boolean;
  isError?: boolean;
  error?: { message?: string } | null | undefined;
  data?: T | null | undefined;
}

/**
 * The three answers a panel owes a reader, instead of an empty box.
 *
 * A query that has failed and a query that was never allowed to run (no
 * operator session) both used to render as the same thing: nothing at all, or
 * — worse — the panel's "none found" message, which states as fact something
 * nobody checked. `isLoading` is false in both cases, so branching on it alone
 * hid them.
 *
 * - fetching            → "Loading…"
 * - rejected            → the error, because a stalled panel with no signal is
 *                         indistinguishable from a quiet one
 * - `null`/`undefined`  → `empty`: the query is disabled, so nothing was asked,
 *                         or the route answered 204 No Content
 *
 * Anything else is real data and goes to `children`, which is called with it.
 */
export function QueryState<T>({
  query,
  empty,
  children,
}: {
  query: QueryStateSource<T>;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const { isLoading, isError, error, data } = query;

  if (isLoading) return <p className="lcars-query-state">Loading…</p>;
  if (isError) {
    return (
      <p className="lcars-query-state lcars-query-state--error">
        {nonEmpty(error?.message) ?? "Request failed"}
      </p>
    );
  }
  if (data === null || data === undefined) {
    return <p className="lcars-query-state lcars-query-state--muted">{empty}</p>;
  }
  return children(data);
}
