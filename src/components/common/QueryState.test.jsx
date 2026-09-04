import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryState } from "./QueryState";

const show = (query) =>
  render(
    <QueryState query={query} notConfigured="Not enabled here." empty="Nothing was asked.">
      {(data) => <p>loaded {data.length}</p>}
    </QueryState>,
  );

describe("QueryState", () => {
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
  // an empty box — or, worse, the panel's own "No contracts" / "No knobs" line,
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

  // `null` is the api clients' "this route 404s because the feature was never
  // enabled on this deployment" — distinct from a failure, and from undefined.
  it("distinguishes a disabled feature from a query that never ran", () => {
    show({ data: null });
    expect(screen.getByText("Not enabled here.")).toBeTruthy();

    show({ data: undefined });
    expect(screen.getByText("Nothing was asked.")).toBeTruthy();
  });
});
