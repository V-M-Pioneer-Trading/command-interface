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

const row = (status: AutopilotStatus["status"]): AutopilotStatus => ({
  status,
  shipSymbol: "SHIP-1",
  phase: "TRAVEL_TO_ASTEROID",
  asteroid: "X1-A1",
  market: "X1-M1",
  waitingUntil: null,
  updatedAt: "2026-10-08T12:00:00.000Z",
});

function renderPanel() {
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
}

describe("AutopilotPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Regression guard: onSuccess must return the invalidation promise, so react-query
  // keeps the mutation pending until the status refetch lands. Settling at once
  // lets a second click through against a stale status (a 409 from the service).
  it("keeps arming pending until the status refetch resolves", async () => {
    const armed = row("armed");
    let finishRefetch: (s: AutopilotStatus) => void = () => undefined;
    const getStatus = vi
      .spyOn(automationService, "getStatus")
      .mockResolvedValueOnce(row("disarmed"))
      .mockImplementationOnce(() => new Promise<AutopilotStatus>((r) => { finishRefetch = r; }));
    vi.spyOn(automationService, "getEvents").mockResolvedValue([]);
    vi.spyOn(automationService, "arm").mockResolvedValue(armed);
    renderPanel();

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

  it("renders any event type as type plus JSON detail", async () => {
    vi.spyOn(automationService, "getStatus").mockResolvedValue(row("armed"));
    vi.spyOn(automationService, "getEvents").mockResolvedValue([
      { id: "1", occurredAt: "2026-10-08T12:00:00.000Z", type: "extract", detail: { units: 7 } },
    ]);
    renderPanel();

    expect(await screen.findByText("extract")).toBeTruthy();
    expect(screen.getByText('{"units":7}')).toBeTruthy();
  });
});
