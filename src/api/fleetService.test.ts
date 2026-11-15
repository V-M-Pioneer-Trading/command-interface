import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { fleetService } from "./fleetService";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// openapi-fetch hands fetch a `Request`, never an `init`.
function capture(respond: () => Response = () => json({})) {
  const seen: Request[] = [];
  vi.stubGlobal("fetch", (req: Request) => {
    seen.push(req);
    return Promise.resolve(respond());
  });
  return seen;
}

afterEach(() => vi.unstubAllGlobals());

const BASE = "http://localhost:3001/api/fleet/v1";
const survey = {
  signature: "S1",
  symbol: "X1-AA-A1",
  deposits: [{ symbol: "IRON_ORE" }],
  expiration: "2030-01-01T00:00:00.000Z",
  size: "SMALL" as const,
};

// [name, call, method, path, body (undefined = none)]
const calls: [string, (t: string | null) => Promise<unknown>, string, string, unknown][] = [
  ["orbit", (t) => fleetService.orbit("SHIP-1", t), "POST", "/ships/SHIP-1/orbit", undefined],
  ["dock", (t) => fleetService.dock("SHIP-1", t), "POST", "/ships/SHIP-1/dock", undefined],
  [
    "navigate",
    (t) => fleetService.navigate("SHIP-1", "X1-AA-B2", t),
    "POST",
    "/ships/SHIP-1/navigate",
    { waypointSymbol: "X1-AA-B2" },
  ],
  ["extract", (t) => fleetService.extract("SHIP-1", t), "POST", "/ships/SHIP-1/extract", undefined],
  [
    "extractWithSurvey",
    (t) => fleetService.extractWithSurvey("SHIP-1", survey, t),
    "POST",
    "/ships/SHIP-1/extract/survey",
    survey,
  ],
  ["survey", (t) => fleetService.survey("SHIP-1", t), "POST", "/ships/SHIP-1/survey", undefined],
  ["refuel", (t) => fleetService.refuel("SHIP-1", t), "POST", "/ships/SHIP-1/refuel", undefined],
  ["getCooldown", (t) => fleetService.getCooldown("SHIP-1", t), "GET", "/ships/SHIP-1/cooldown", undefined],
  ["getCargo", (t) => fleetService.getCargo("SHIP-1", t), "GET", "/ships/SHIP-1/cargo", undefined],
  [
    "deliverContract",
    (t) => fleetService.deliverContract("C-9", "SHIP-1", "IRON_ORE", 5, t),
    "POST",
    "/contracts/C-9/deliver",
    { shipSymbol: "SHIP-1", tradeSymbol: "IRON_ORE", units: 5 },
  ],
  [
    "setFlightMode",
    (t) => fleetService.setFlightMode("SHIP-1", "BURN", t),
    "PATCH",
    "/ships/SHIP-1/nav",
    { flightMode: "BURN" },
  ],
  [
    "transferCargo",
    (t) => fleetService.transferCargo("SHIP-1", "IRON_ORE", 3, "SHIP-2", t),
    "POST",
    "/ships/SHIP-1/transfer",
    { tradeSymbol: "IRON_ORE", units: 3, shipSymbol: "SHIP-2" },
  ],
];

describe("fleetService requests", () => {
  it.each(calls)("%s sends method, URL, body and the Clerk token", async (_n, run, method, path, body) => {
    const seen = capture(() => json({ data: {} }));
    await run("clerk-jwt");
    const req = seen[0];
    expect(req?.method).toBe(method);
    expect(req?.url).toBe(`${BASE}${path}`);
    expect(req?.headers.get("Authorization")).toBe("Bearer clerk-jwt");
    const text = await req?.text();
    if (body === undefined) {
      expect(text).toBe("");
      expect(req?.headers.has("Content-Type")).toBe(false);
    } else {
      expect(JSON.parse(text ?? "")).toEqual(body);
    }
  });

  it.each(calls)("%s sends no Authorization header for a null token", async (_n, run) => {
    const seen = capture(() => json({ data: {} }));
    await run(null);
    expect(seen[0]?.headers.has("Authorization")).toBe(false);
  });

  it("percent-encodes path params", async () => {
    const seen = capture();
    await fleetService.orbit("A/B", "t");
    expect(seen[0]?.url).toBe(`${BASE}/ships/A%2FB/orbit`);
  });

  it("sends the token of each call, never one remembered", async () => {
    const seen = capture();
    await fleetService.dock("S", "first");
    await fleetService.dock("S", "second");
    expect(seen.map((r) => r.headers.get("Authorization"))).toEqual(["Bearer first", "Bearer second"]);
  });
});

describe("fleetService responses", () => {
  it("getCooldown: 204 reads as null", async () => {
    capture(() => new Response(null, { status: 204 }));
    expect(await fleetService.getCooldown("S", "t")).toBeNull();
  });

  it("getCooldown: 200 returns the body", async () => {
    const body = { data: { shipSymbol: "S", totalSeconds: 60, remainingSeconds: 30 } };
    capture(() => json(body));
    expect(await fleetService.getCooldown("S", "t")).toEqual(body);
  });

  it("getCooldown: other non-2xx still throws", async () => {
    capture(() => json({ error: "nope" }, 500));
    await expect(fleetService.getCooldown("S", "t")).rejects.toMatchObject({ status: 500, message: "nope" });
  });

  it("raises ApiError with a flat error message", async () => {
    capture(() => json({ error: "Ship is not docked" }, 400));
    const err = await fleetService.refuel("S", "t").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: "Ship is not docked" });
  });

  it("raises ApiError with a nested error message", async () => {
    capture(() => json({ error: { message: "Cooldown active" } }, 409));
    await expect(fleetService.extract("S", "t")).rejects.toMatchObject({ status: 409, message: "Cooldown active" });
  });
});
