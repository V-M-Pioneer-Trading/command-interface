import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { navigationService } from "./navigationService";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// openapi-fetch hands fetch a `Request`, never an `init`: read the Request.
function capture(respond: () => Response = () => json({})) {
  const seen: Request[] = [];
  vi.stubGlobal("fetch", (req: Request) => {
    seen.push(req);
    return Promise.resolve(respond());
  });
  return seen;
}

function only(seen: Request[]): Request {
  const [req] = seen;
  if (!req) throw new Error("no request was sent");
  return req;
}

afterEach(() => vi.unstubAllGlobals());

const reads: [string, (token?: string | null) => Promise<unknown>, string, unknown][] = [
  ["getWaypoint", (t) => navigationService.getWaypoint("X1-A-B1", t), "/api/navigation/v1/waypoints/X1-A-B1", {}],
  [
    "getSystemWaypoints",
    (t) => navigationService.getSystemWaypoints("X1-A", t),
    "/api/navigation/v1/systems/X1-A/waypoints",
    { data: [], total: 0 },
  ],
  ["getMarket", (t) => navigationService.getMarket("X1-A-B1", t), "/api/navigation/v1/waypoints/X1-A-B1/market", {}],
  [
    "getShipyard",
    (t) => navigationService.getShipyard("X1-A-B1", t),
    "/api/navigation/v1/waypoints/X1-A-B1/shipyard",
    {},
  ],
];

describe("navigationService reads", () => {
  it.each(reads)("%s is a GET to the spec path", async (_n, run, path, body) => {
    const seen = capture(() => json(body));
    await run();
    expect(seen[0]?.method).toBe("GET");
    expect(new URL(only(seen).url).pathname).toBe(path);
    expect(only(seen).url).toMatch(/^https?:\/\/[^/]+\/api\/navigation\/v1\//);
  });

  it.each(reads)("%s sends no headers at all without a token", async (_n, run, _p, body) => {
    for (const token of [null, undefined]) {
      const seen = capture(() => json(body));
      await run(token);
      expect([...only(seen).headers]).toEqual([]);
    }
  });

  it.each(reads)("%s sends exactly one Bearer header with a token", async (_n, run, _p, body) => {
    const seen = capture(() => json(body));
    await run("clerk-jwt");
    expect([...only(seen).headers]).toEqual([["authorization", "Bearer clerk-jwt"]]);
  });

  it.each(reads)("%s never sends the game credential or a priority", async (_n, run, _p, body) => {
    const seen = capture(() => json(body));
    await run("clerk-jwt");
    expect(only(seen).headers.has("x-spacetraders-token")).toBe(false);
    expect(only(seen).headers.has("x-priority")).toBe(false);
  });

  it("never sends forceRefresh", async () => {
    const seen = capture(() => json({ data: [], total: 0 }));
    await navigationService.getSystemWaypoints("X1-A");
    expect(new URL(only(seen).url).search).toBe("");
  });
});

describe("navigationService errors", () => {
  const bodies: [string, () => Response, string][] = [
    ["body-less", () => new Response(null, { status: 404, statusText: "Not Found" }), "Not Found"],
    ["ProblemDetail", () => json({ type: "x", title: "Nope", status: 404, detail: "gone" }, 404), ""],
    ["nested", () => json({ error: { message: "nested boom" } }, 404), "nested boom"],
    ["plain text", () => new Response("upstream down", { status: 404, statusText: "Not Found" }), "Not Found"],
  ];

  it.each(bodies)("%s 4xx raises ApiError with the status", async (_n, respond, message) => {
    capture(respond);
    const err = await navigationService.getWaypoint("X1-A-B1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    if (message) expect((err as ApiError).message).toBe(message);
  });
});
