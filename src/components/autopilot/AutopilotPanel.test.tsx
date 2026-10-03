import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertProvider } from "../../context/AlertProvider";
import { OperatorContext, SCOPE_FLEET_CONTROL, type Operator } from "../../context/OperatorContext";
import { automationService } from "../../api/automationService";
import type { AutopilotStatus } from "../../api/types";
import { AutopilotPanel } from "./AutopilotPanel";

const operator: Operator = {
  isLoaded: true,
  isSignedIn: true,
  signOut: () => Promise.resolve(),
  getToken: () => Promise.resolve("t"),
  can: (s) => s === SCOPE_FLEET_CONTROL,
};

describe("AutopilotPanel mutations", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Regression guard: onSuccess must return the invalidation promise, so react-query
  // keeps the mutation pending until the status refetch lands. Settling at once
  // lets a second click through against a stale status (a 409 from the service).
  it("keeps arming pending until the status refetch resolves", async () => {
    const armed = { status: "armed", mode: "live" } as AutopilotStatus;
    let finishRefetch: (s: AutopilotStatus) => void = () => undefined;
    const getStatus = vi
      .spyOn(automationService, "getStatus")
      .mockResolvedValueOnce({ status: "disarmed", mode: "live" })
      .mockImplementationOnce(() => new Promise<AutopilotStatus>((r) => { finishRefetch = r; }));
    vi.spyOn(automationService, "arm").mockResolvedValue(armed);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AlertProvider>
          <OperatorContext.Provider value={operator}>
            <AutopilotPanel onClose={() => undefined} />
          </OperatorContext.Provider>
        </AlertProvider>
      </QueryClientProvider>,
    );

    const arm = await screen.findByRole<HTMLButtonElement>("button", { name: "Arm" });
    await vi.waitFor(() => { expect(getStatus).toHaveBeenCalledTimes(1); });
    await vi.waitFor(() => { expect(arm.disabled).toBe(false); });

    fireEvent.click(arm);
    // Arm has answered and the refetch has started, but not finished.
    await vi.waitFor(() => { expect(getStatus).toHaveBeenCalledTimes(2); });
    expect(arm.disabled).toBe(true);

    await act(async () => { finishRefetch(armed); await Promise.resolve(); });
    await vi.waitFor(() => { expect(arm.disabled).toBe(false); });
  });
});
