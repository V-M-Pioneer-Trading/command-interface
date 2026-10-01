import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertProvider } from "../../context/AlertContext";
import { OperatorContext } from "../../context/OperatorContext";
import { automationService } from "../../api/automationService";
import { KnobEditor } from "./KnobEditor";

const knob = { name: "minMargin", value: 3, min: 0, max: 10, default: 3, class: "policy", description: "d" };

function show(scopes) {
  vi.spyOn(automationService, "getKnobs").mockResolvedValue([knob]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const operator = { isLoaded: true, isSignedIn: true, getToken: async () => "t", can: (s) => scopes.includes(s) };
  render(
    <QueryClientProvider client={client}>
      <AlertProvider>
        <OperatorContext.Provider value={operator}>
          <KnobEditor onClose={() => {}} />
        </OperatorContext.Provider>
      </AlertProvider>
    </QueryClientProvider>,
  );
  return screen.findByRole("spinbutton");
}

describe("KnobEditor scope gating", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets planner:advise without fleet:control edit", async () => {
    const input = await show(["planner:advise"]);
    expect(input.disabled).toBe(false);
    expect(screen.queryByText(/read-only/)).toBeNull();
  });

  it("is read-only with fleet:control alone", async () => {
    const input = await show(["fleet:control"]);
    expect(input.disabled).toBe(true);
    expect(screen.getByText("This account has no planner:advise scope. Values are read-only.")).toBeTruthy();
  });
});
