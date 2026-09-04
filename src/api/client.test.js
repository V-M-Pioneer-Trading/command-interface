import { describe, expect, it } from "vitest";
import { ApiError, readResponse, withQuery } from "./client";

const json = (body, status = 200) =>
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

  // "Absent" is a normal answer on some routes (a ship automation-service isn't
  // managing, an optional feature nobody enabled) and a failure on the rest.
  it("only treats 404 as null where the caller opted in", async () => {
    await expect(readResponse(json({}, 404), { allow404: true })).resolves.toBeNull();
    await expect(readResponse(json({ error: "gone" }, 404))).rejects.toThrow("gone");
  });
});

describe("withQuery", () => {
  it("appends only the params that were supplied", () => {
    expect(withQuery("/metrics/context", { rollupLimit: 20, eventLimit: undefined })).toBe(
      "/metrics/context?rollupLimit=20",
    );
  });

  it("leaves the path alone when nothing was supplied", () => {
    expect(withQuery("/anomalies/digest", {})).toBe("/anomalies/digest");
    expect(withQuery("/anomalies/digest")).toBe("/anomalies/digest");
  });
});
