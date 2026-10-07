import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryState, type QueryStateSource } from "./QueryState";

const show = (query: QueryStateSource<number[]>) =>
  render(
    <QueryState query={query} empty="Nothing was asked.">
      {(data) => <p>loaded {data.length}</p>}
    </QueryState>,
  );

describe("QueryState", () => {
  afterEach(cleanup);

  it("renders the data when there is data", () => {
    show({ data: [1, 2] });
    expect(screen.getByText("loaded 2")).toBeTruthy();
  });

  it("says so while fetching", () => {
    show({ isLoading: true });
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  // Regression: panels branched on `isLoading` alone. react-query reports
  // isLoading false for a *failed* query, so a backend that was down rendered
  // an empty box — or, worse, the panel's own "No contracts" / "No ships" line,
  // stating as fact something nobody had successfully checked.
  it("shows the error when the request failed", () => {
    show({ isError: true, error: new Error("automation-service unreachable") });
    expect(screen.getByText("automation-service unreachable")).toBeTruthy();
    expect(screen.queryByText("Nothing was asked.")).toBeNull();
  });

  it("still says something when the failure carries no message", () => {
    show({ isError: true, error: undefined });
    expect(screen.getByText("Request failed")).toBeTruthy();
  });

  // `undefined` is a query that never ran; `null` is a 204 from readResponse.
  it.each([undefined, null])("renders the empty line for %s data", (data) => {
    show({ data });
    expect(screen.getByText("Nothing was asked.")).toBeTruthy();
  });
});
