import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { bearer, serviceClient, unwrap } from "./serviceClient";
import type { paths } from "../generated/agent-service";

const PROD_URL = "https://spacetraders.radomskyi.com/api/agent/v1";

const jsonResponse = (body: unknown, status = 200, statusText = "") =>
  new Response(JSON.stringify(body), { status, statusText, headers: { "Content-Type": "application/json" } });

// The stub is installed per test, after the module graph has loaded: a client
// that captured `fetch` at creation would never see it.
const stubFetch = (response: () => Response) => {
  const seen: Request[] = [];
  vi.stubGlobal("fetch", (req: Request) => {
    seen.push(req);
    return Promise.resolve(response());
  });
  return seen;
};

afterEach(() => vi.unstubAllGlobals());

describe("serviceClient", () => {
  it("keeps the mount exactly once: origin of the service URL plus the spec's absolute path", async () => {
    const seen = stubFetch(() => jsonResponse([]));
    await serviceClient<paths>(PROD_URL).GET("/api/agent/v1/ships");
    expect(seen[0]?.url).toBe("https://spacetraders.radomskyi.com/api/agent/v1/ships");
  });

  it("resolves a relative service URL against the page instead of throwing", async () => {
    const seen = stubFetch(() => jsonResponse([]));
    expect(() => serviceClient<paths>("/api/agent/v1")).not.toThrow();
    await serviceClient<paths>("/api/agent/v1").GET("/api/agent/v1/ships");
    expect(seen[0]?.url).toBe(`${globalThis.location.origin}/api/agent/v1/ships`);
  });

  it("calls the fetch that is current at call time", async () => {
    const client = serviceClient<paths>(PROD_URL);
    const seen = stubFetch(() => jsonResponse([]));
    await client.GET("/api/agent/v1/ships");
    expect(seen).toHaveLength(1);
  });

  it("sends no Authorization unless the call adds one", async () => {
    const seen = stubFetch(() => jsonResponse([]));
    await serviceClient<paths>(PROD_URL).GET("/api/agent/v1/ships");
    expect(seen[0]?.headers.has("Authorization")).toBe(false);
  });
});

describe("bearer", () => {
  it("is empty without a token", () => {
    expect(bearer(null)).toEqual({});
    expect(bearer(undefined)).toEqual({});
    expect(bearer("")).toEqual({});
  });

  it("carries the token for that call only", async () => {
    const seen = stubFetch(() => jsonResponse([]));
    const client = serviceClient<paths>(PROD_URL);
    await client.GET("/api/agent/v1/ships", bearer("tok-1"));
    await client.GET("/api/agent/v1/ships", bearer(null));
    expect(seen[0]?.headers.get("Authorization")).toBe("Bearer tok-1");
    expect(seen[1]?.headers.has("Authorization")).toBe(false);
  });
});

describe("unwrap", () => {
  const call = () => serviceClient<paths>(PROD_URL).GET("/api/agent/v1/ships");

  it("returns the body", async () => {
    stubFetch(() => jsonResponse([{ symbol: "S-1" }]));
    await expect(unwrap(call())).resolves.toEqual([{ symbol: "S-1" }]);
  });

  it("returns a literal JSON null as null", async () => {
    stubFetch(() => jsonResponse(null));
    await expect(unwrap(call())).resolves.toBeNull();
  });

  it("throws ApiError with the flat error message", async () => {
    stubFetch(() => jsonResponse({ error: "no session" }, 401, "Unauthorized"));
    const err: unknown = await unwrap(call()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, message: "no session" });
  });

  it("falls back to statusText for a plain-text body", async () => {
    stubFetch(() => new Response("upstream down", { status: 502, statusText: "Bad Gateway" }));
    await expect(unwrap(call())).rejects.toMatchObject({ status: 502, message: "Bad Gateway" });
  });

  it("falls back to statusText for an empty error body", async () => {
    stubFetch(() => new Response(null, { status: 503, statusText: "Service Unavailable" }));
    await expect(unwrap(call())).rejects.toMatchObject({ status: 503, message: "Service Unavailable" });
  });
});
