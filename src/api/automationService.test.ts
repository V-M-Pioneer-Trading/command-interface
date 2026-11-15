import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { automationService } from "./automationService";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const knob = { name: "minMargin", class: "policy", value: 3, default: 3, min: 0, max: 10, description: "" };
const bodies: Record<string, unknown> = {
  status: { status: "armed", mode: "live" },
  task: { task: { taskKind: "mining", phase: "extracting" } },
  metrics: { rollups: [], events: [] },
  anomalies: { anomalies: [], events: [] },
  knobs: { knobs: [knob] },
  knob: { knob },
};

// openapi-fetch hands fetch a `Request`, never an `init`: headers are read off it.
function capture(respond: () => Response = () => json({})) {
  const seen: Request[] = [];
  vi.stubGlobal("fetch", (req: Request) => {
    seen.push(req);
    return Promise.resolve(respond());
  });
  return seen;
}

afterEach(() => vi.unstubAllGlobals());

describe("automationService Authorization", () => {
  const writes: [string, (token: string) => Promise<unknown>][] = [
    ["arm", (t) => automationService.arm("live", t)],
    ["pause", (t) => automationService.pause(t)],
    ["abort", (t) => automationService.abort(t)],
    ["setKnob", (t) => automationService.setKnob("minMargin", 3, t)],
  ];

  it.each(writes)("%s sends the Clerk session as a Bearer token", async (_name, run) => {
    const seen = capture(() => json({ ...bodies.status as object, ...bodies.knob as object }));
    await run("clerk-jwt");
    expect(seen[0]?.headers.get("Authorization")).toBe("Bearer clerk-jwt");
  });

  it("sends the token of each call, never one remembered from an earlier call", async () => {
    const seen = capture(() => json(bodies.status));
    await automationService.pause("first");
    await automationService.pause("second");
    expect(seen.map((r) => r.headers.get("Authorization"))).toEqual(["Bearer first", "Bearer second"]);
  });

  // Public reads must stay CORS-simple: no headers at all.
  const reads: [string, () => Promise<unknown>, unknown][] = [
    ["getStatus", () => automationService.getStatus(), bodies.status],
    ["getShipTask", () => automationService.getShipTask("SHIP-1"), bodies.task],
    ["getMetricsContext", () => automationService.getMetricsContext({ rollupLimit: 5 }), bodies.metrics],
    ["getAnomaliesDigest", () => automationService.getAnomaliesDigest({ windowMinutes: 30 }), bodies.anomalies],
    ["getKnobs", () => automationService.getKnobs(), bodies.knobs],
  ];

  it.each(reads)("%s sends no headers on a public read", async (_name, run, body) => {
    const seen = capture(() => json(body));
    await run();
    expect(seen).toHaveLength(1);
    expect([...(seen[0]?.headers ?? [])]).toEqual([]);
  });
});

describe("automationService requests", () => {
  it("sends query numbers as the spec's strings and drops undefined ones", async () => {
    const seen = capture(() => json(bodies.anomalies));
    await automationService.getAnomaliesDigest({ windowMinutes: 30, eventLimit: 10 });
    const url = new URL(seen[0]?.url ?? "");
    expect(url.pathname).toBe("/api/automation/v1/anomalies/digest");
    expect(Object.fromEntries(url.searchParams)).toEqual({ windowMinutes: "30", eventLimit: "10" });
  });

  it("arm sends the mode in a JSON body, setKnob the value", async () => {
    const seen = capture(() => json({ ...(bodies.status as object), ...(bodies.knob as object) }));
    await automationService.arm("shadow", "t");
    await automationService.setKnob("minMargin", 4, "t");
    expect(seen[0]?.method).toBe("POST");
    expect(await seen[0]?.json()).toEqual({ mode: "shadow" });
    expect(seen[1]?.method).toBe("PUT");
    expect(new URL(seen[1]?.url ?? "").pathname).toBe("/api/automation/v1/planner/knobs/minMargin");
    expect(await seen[1]?.json()).toEqual({ value: 4 });
  });
});

describe("automationService answers", () => {
  it("unwraps the ship task and the knobs", async () => {
    capture(() => json(bodies.task));
    expect(await automationService.getShipTask("SHIP-1")).toEqual({ taskKind: "mining", phase: "extracting" });
    capture(() => json(bodies.knobs));
    expect(await automationService.getKnobs()).toEqual([knob]);
  });

  const absentable: [string, () => Promise<unknown>][] = [
    ["getShipTask", () => automationService.getShipTask("SHIP-1")],
    ["getMetricsContext", () => automationService.getMetricsContext()],
    ["getAnomaliesDigest", () => automationService.getAnomaliesDigest()],
  ];

  it.each(absentable)("%s returns null on 404", async (_name, run) => {
    capture(() => json({ error: { message: "not found" } }, 404));
    expect(await run()).toBeNull();
  });

  it.each(absentable)("%s raises ApiError with the nested message on another non-2xx", async (_name, run) => {
    capture(() => json({ error: { message: "boom" } }, 500));
    await expect(run()).rejects.toMatchObject({ status: 500, message: "boom" });
    await expect(run()).rejects.toBeInstanceOf(ApiError);
  });

  it("getStatus raises ApiError with the nested message", async () => {
    capture(() => json({ error: { message: "nope" } }, 403));
    await expect(automationService.getStatus()).rejects.toMatchObject({ status: 403, message: "nope" });
  });
});
