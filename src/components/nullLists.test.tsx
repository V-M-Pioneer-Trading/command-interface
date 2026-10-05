import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertProvider } from "../context/AlertProvider";
import { OperatorContext, type Operator } from "../context/OperatorContext";
import { SelectionContext } from "../context/SelectionContext";
import { agentService } from "../api/agentService";
import type { Contract } from "../api/types";
import { FleetList } from "./fleet/FleetList";
import { ContractsPanel } from "./contracts/ContractsPanel";

const operator: Operator = {
  isLoaded: true,
  isSignedIn: true,
  signOut: () => Promise.resolve(),
  getToken: () => Promise.resolve("t"),
  can: () => false,
};

const renderPanel = (panel: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AlertProvider>
        <OperatorContext.Provider value={operator}>
          <SelectionContext.Provider value={{ selectedShipSymbol: null, setSelectedShipSymbol: () => undefined }}>
            {panel}
          </SelectionContext.Provider>
        </OperatorContext.Provider>
      </AlertProvider>
    </QueryClientProvider>,
  );
};

// agent-service answers a literal JSON `null` for /ships and /contracts when the
// gateway sent no list. That is an empty fleet, not an unconfigured feature:
// before the query functions normalised it, QueryState saw `null` and rendered
// its blank "not configured" paragraph instead of the panel's own empty state.
describe("null list answers from agent-service", () => {
  afterEach(cleanup);

  it("renders the empty fleet state for a null /ships", async () => {
    vi.spyOn(agentService, "getShips").mockResolvedValue(null);
    renderPanel(<FleetList />);
    expect(await screen.findByText("No ships")).toBeTruthy();
  });

  it("renders the empty fleet state for an empty /ships", async () => {
    vi.spyOn(agentService, "getShips").mockResolvedValue([]);
    renderPanel(<FleetList />);
    expect(await screen.findByText("No ships")).toBeTruthy();
  });

  it("renders the empty contracts state for a null /contracts", async () => {
    vi.spyOn(agentService, "getContracts").mockResolvedValue(null);
    renderPanel(<ContractsPanel onClose={() => undefined} />);
    expect(await screen.findByText("No contracts")).toBeTruthy();
  });

  it("renders a contract whose terms.deliver is null", async () => {
    const contract: Contract = {
      id: "contract-12345678",
      type: "PROCUREMENT",
      accepted: false,
      fulfilled: false,
      terms: { payment: { onAccepted: 1, onFulfilled: 2 }, deliver: null },
    };
    vi.spyOn(agentService, "getContracts").mockResolvedValue([contract]);
    renderPanel(<ContractsPanel onClose={() => undefined} />);
    expect(await screen.findByText("contract")).toBeTruthy();
  });
});
