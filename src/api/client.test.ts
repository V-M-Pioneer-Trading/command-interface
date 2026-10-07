import { describe, expect, it, vi } from "vitest";
import { ApiError, readResponse, request, withQuery } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("readResponse", () => {
  it("parses a successful body", async () => {
    await expect(readResponse(json({ ok: true }))).resolves.toEqual({ ok: true });
  });

  it("returns null for 204 No Content", async () => {
    await expect(readResponse(new Response(null, { status: 204 }))).resolves.toBeNull();
  });

  // Regression: automation-service nests its message as { error: { message } },
  // which the shared parser read as the string "[object Object]" — so it kept a
  // second, private copy of this function. One parser now covers both shapes.
  it("unwraps a nested { error: { message } } body", async () => {
    await expect(readResponse(json({ error: { message: "InvalidTransition" } }, 409))).rejects.toThrow(
      "InvalidTransition",
    );
  });

  it("unwraps a flat { error } body", async () => {
    await expect(readResponse(json({ error: "nope" }, 400))).rejects.toThrow("nope");
  });

  it("falls back to the status text when the body is not JSON", async () => {
    const res = new Response("<html>502</html>", { status: 502, statusText: "Bad Gateway" });
    await expect(readResponse(res)).rejects.toThrow("Bad Gateway");
  });

  it("carries the status code so callers can tell a 409 from a 500", async () => {
    await expect(readResponse(json({ error: "x" }, 409))).rejects.toMatchObject({
      status: 409,
      constructor: ApiError,
    });
  });

  it("treats a 404 as a failure", async () => {
    await expect(readResponse(json({ error: "gone" }, 404))).rejects.toThrow("gone");
  });
});

describe("withQuery", () => {
  it("appends only the params that were supplied", () => {
    expect(withQuery("/autopilot/events", { limit: 20, after: undefined })).toBe("/autopilot/events?limit=20");
  });

  it("leaves the path alone when nothing was supplied", () => {
    expect(withQuery("/autopilot/events", {})).toBe("/autopilot/events");
    expect(withQuery("/autopilot/events")).toBe("/autopilot/events");
  });
});

describe("request", () => {
  const capture = () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ ok: true }));
    globalThis.fetch = fetchMock;
    // request() always builds its headers as a plain object.
    return () => (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
  };

  it("sends the Clerk session as Authorization", async () => {
    const headers = capture();
    await request("http://svc", "/agent", { authToken: "clerk-jwt" });
    expect(headers().Authorization).toBe("Bearer clerk-jwt");
  });

  // auth-design.md decisions 2 and 5: st-gateway injects the game token and
  // derives priority from the session it verifies. Either header reappearing
  // here would be a regression — one re-exposes a credential the browser is no
  // longer trusted with, the other lets this app promote its own traffic.
  it("sends neither the game token nor a priority hint", async () => {
    const headers = capture();
    await request("http://svc", "/agent", { authToken: "clerk-jwt" });
    expect(headers()).not.toHaveProperty("X-SpaceTraders-Token");
    expect(headers()).not.toHaveProperty("X-Priority");
  });

  it("omits Authorization entirely for an anonymous caller", async () => {
    const headers = capture();
    await request("http://svc", "/waypoints/X1-FQ86-B29");
    expect(headers()).not.toHaveProperty("Authorization");
  });
});
