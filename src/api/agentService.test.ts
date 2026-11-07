import { afterEach, describe, expect, it, vi } from "vitest";
import { agentService } from "./agentService";
import { ApiError } from "./client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Installed after import on purpose: the production module graph must call the
// fetch that is current at call time (src/devMap.tsx swaps it after import).
const stubFetch = (response: () => Response = () => jsonResponse({})) => {
  const seen: Request[] = [];
  vi.stubGlobal("fetch", (req: Request) => {
    seen.push(req);
    return Promise.resolve(response());
  });
  return seen;
};

afterEach(() => vi.unstubAllGlobals());

// config.agentServiceUrl is the localhost default under test; what matters is
// that the mount "/api/agent/v1" appears once, then the route.
const MOUNT = "/api/agent/v1";

describe("agentService requests", () => {
  const cases: {
    name: string;
    run: () => Promise<unknown>;
    method: string;
    path: string;
    body?: unknown;
  }[] = [
    { name: "getCurrentAgent", run: () => agentService.getCurrentAgent("t"), method: "GET", path: "/current-agent" },
    { name: "getAgent", run: () => agentService.getAgent("t"), method: "GET", path: "/agent" },
    { name: "getShips", run: () => agentService.getShips("t"), method: "GET", path: "/ships" },
    { name: "getShip", run: () => agentService.getShip("A B/1", "t"), method: "GET", path: "/ships/A%20B%2F1" },
    { name: "getContracts", run: () => agentService.getContracts("t"), method: "GET", path: "/contracts" },
    { name: "getContract", run: () => agentService.getContract("c 1", "t"), method: "GET", path: "/contracts/c%201" },
    {
      name: "acceptContract",
      run: () => agentService.acceptContract("c1", "t"),
      method: "POST",
      path: "/contracts/c1/accept",
    },
    {
      name: "fulfillContract",
      run: () => agentService.fulfillContract("c1", "t"),
      method: "POST",
      path: "/contracts/c1/fulfill",
    },
    {
      name: "purchaseCargo",
      run: () => agentService.purchaseCargo("S-1", "IRON_ORE", 5, "t"),
      method: "POST",
      path: "/ships/S-1/purchase",
      body: { symbol: "IRON_ORE", units: 5 },
    },
    {
      name: "sell",
      run: () => agentService.sell("S-1", "IRON_ORE", 5, "t"),
      method: "POST",
      path: "/ships/S-1/sell",
      body: { symbol: "IRON_ORE", units: 5 },
    },
    {
      name: "purchaseShip",
      run: () => agentService.purchaseShip("SHIP_MINING_DRONE", "X1-A-B1", "t"),
      method: "POST",
      path: "/ships/purchase",
      body: { shipType: "SHIP_MINING_DRONE", waypointSymbol: "X1-A-B1" },
    },
  ];

  it.each(cases)("$name: method, url, bearer, body", async ({ run, method, path, body }) => {
    const seen = stubFetch();
    await run();
    expect(seen).toHaveLength(1);
    const req = seen[0];
    if (!req) throw new Error("no request was made");
    expect(new URL(req.url).pathname).toBe(`${MOUNT}${path}`);
    expect(req.method).toBe(method);
    expect(req.headers.get("Authorization")).toBe("Bearer t");
    if (body === undefined) {
      expect(await req.text()).toBe("");
    } else {
      expect(JSON.parse(await req.text())).toEqual(body);
      expect(req.headers.get("Content-Type")).toContain("application/json");
    }
  });

  it("sends no Authorization without a token", async () => {
    const seen = stubFetch();
    await agentService.getAgent(null);
    expect(seen[0]?.headers.has("Authorization")).toBe(false);
  });

  it("does not remember a token between calls", async () => {
    const seen = stubFetch();
    await agentService.getAgent("first");
    await agentService.getAgent("second");
    await agentService.getAgent(null);
    expect(seen.map((r) => r.headers.get("Authorization"))).toEqual(["Bearer first", "Bearer second", null]);
  });
});

describe("agentService answers", () => {
  it("returns null for a literal JSON null from /ships and /contracts", async () => {
    stubFetch(() => jsonResponse(null));
    await expect(agentService.getShips("t")).resolves.toBeNull();
    await expect(agentService.getContracts("t")).resolves.toBeNull();
  });

  it("throws ApiError from a flat, message or nested error body, else statusText", async () => {
    const attempt = async (res: Response) => {
      stubFetch(() => res);
      return agentService.getAgent("t").catch((e: unknown) => e);
    };
    expect(await attempt(jsonResponse({ error: "flat" }, 403))).toEqual(new ApiError(403, "flat"));
    expect(await attempt(jsonResponse({ message: "msg" }, 400))).toEqual(new ApiError(400, "msg"));
    expect(await attempt(jsonResponse({ error: { message: "nested" } }, 409))).toEqual(
      new ApiError(409, "nested"),
    );
    const err = await attempt(new Response(null, { status: 504, statusText: "Gateway Timeout" }));
    expect(err).toEqual(new ApiError(504, "Gateway Timeout"));
    expect(err).toMatchObject({ status: 504 });
  });
});
