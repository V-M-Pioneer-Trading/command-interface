import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { OperatorContext, SCOPE_FLEET_CONTROL, scopesFromToken, useOperator } from "./OperatorContext";

function jwtWith(claims) {
  const b64 = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}

describe("useOperator", () => {
  // Regression: this used to call Clerk's `useAuth` directly, which *throws*
  // outside a <ClerkProvider>. Any tree without Clerk — the dev map harness,
  // or the real app if Clerk failed to mount — white-screened on render instead
  // of falling back to the anonymous observer the design calls for.
  it("reports a signed-out observer when there is no provider", () => {
    const { result } = renderHook(() => useOperator());

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(false);
  });

  it("hands out no credential when signed out, so calls go out unauthenticated", async () => {
    const { result } = renderHook(() => useOperator());
    await expect(result.current.getToken()).resolves.toBeNull();
  });

  it("reads whatever the surrounding provider supplies", () => {
    const wrapper = ({ children }) => (
      <OperatorContext.Provider
        value={{ isLoaded: true, isSignedIn: true, can: (s) => s === SCOPE_FLEET_CONTROL }}
      >
        {children}
      </OperatorContext.Provider>
    );
    const { result } = renderHook(() => useOperator(), { wrapper });

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(true);
    expect(result.current.can("agent:reset")).toBe(false);
  });
});

describe("scopesFromToken", () => {
  it("reads a space-separated scope claim", () => {
    expect(scopesFromToken(jwtWith({ scope: "fleet:control agent:reset" }))).toEqual([
      "fleet:control",
      "agent:reset",
    ]);
  });

  it("reads an array scope claim", () => {
    expect(scopesFromToken(jwtWith({ scope: ["fleet:control"] }))).toEqual(["fleet:control"]);
  });

  // The decode is optimistic and unverified — it only decides whether a button
  // renders enabled — so anything unreadable must mean "no scopes", never throw.
  it("grants nothing for a token it cannot read", () => {
    expect(scopesFromToken(undefined)).toEqual([]);
    expect(scopesFromToken("not-a-jwt")).toEqual([]);
    expect(scopesFromToken("a.!!!not-base64!!!.c")).toEqual([]);
    expect(scopesFromToken(jwtWith({}))).toEqual([]);
  });
});
