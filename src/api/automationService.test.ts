import { describe, expect, it, vi } from "vitest";
import { automationService } from "./automationService";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

function capture() {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(json({ status: "armed" })));
  globalThis.fetch = fetchMock;
  return () => {
    const init = fetchMock.mock.calls[0]?.[1];
    // call() builds its headers as a plain object, or omits them entirely.
    return init?.headers as Record<string, string> | undefined;
  };
}

describe("automationService Authorization", () => {
  const writes: [string, (token: string) => Promise<unknown>][] = [
    ["arm", (t) => automationService.arm(t)],
    ["pause", (t) => automationService.pause(t)],
  ];

  it.each(writes)("%s sends the Clerk session as a Bearer token", async (_name, run) => {
    const headers = capture();
    await run("clerk-jwt");
    expect(headers()?.Authorization).toBe("Bearer clerk-jwt");
  });

  // Public reads must stay CORS-simple: no headers at all.
  it("sends no headers on a public read", async () => {
    const headers = capture();
    await automationService.getStatus();
    expect(headers()).toBeUndefined();
  });
});

describe("automationService.getEvents", () => {
  it("passes the limit and unwraps the { events } envelope", async () => {
    const events = [{ id: "1", occurredAt: "2026-10-08T12:00:00.000Z", type: "sell", detail: {} }];
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ events }));
    globalThis.fetch = fetchMock;

    await expect(automationService.getEvents(50)).resolves.toEqual(events);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/autopilot\/events\?limit=50$/), expect.anything());
  });
});
