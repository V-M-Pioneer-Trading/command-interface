import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  OperatorContext,
  SCOPE_FLEET_CONTROL,
  scopesFromToken,
  useOperator,
} from "./OperatorContext";
import { OperatorProvider } from "./OperatorProvider";

// Any second scope will do; this one is only a token claim the tests change.
const SCOPE_PLANNER_ADVISE = "planner:advise";

const clerk = {
  isLoaded: true,
  isSignedIn: true,
  getToken: vi.fn<() => Promise<string | null>>(),
  signOut: vi.fn(),
};
vi.mock("@clerk/clerk-react", () => ({ useAuth: () => clerk }));

function jwtWith(claims: Record<string, unknown>) {
  const b64 = (obj: unknown) =>
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
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OperatorContext.Provider
        value={{
          isLoaded: true,
          isSignedIn: true,
          signOut: () => Promise.resolve(),
          getToken: () => Promise.resolve(null),
          can: (s) => s === SCOPE_FLEET_CONTROL,
        }}
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

describe("OperatorProvider scope refresh", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <OperatorProvider>{children}</OperatorProvider>
  );
  const flush = () => act(() => Promise.resolve());
  const tick = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));

  beforeEach(() => {
    vi.useFakeTimers();
    clerk.isSignedIn = true;
    clerk.getToken = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  function tokenChangesAfterFirstCall() {
    clerk.getToken
      .mockResolvedValueOnce(jwtWith({ scope: "fleet:control" }))
      .mockResolvedValue(jwtWith({ scope: "fleet:control planner:advise" }));
  }

  it("picks up new scopes after 60 seconds", async () => {
    tokenChangesAfterFirstCall();
    const { result } = renderHook(() => useOperator(), { wrapper });
    await flush();
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(false);

    await tick(60_000);
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(true);
  });

  it("picks up new scopes when the window regains focus", async () => {
    tokenChangesAfterFirstCall();
    const { result } = renderHook(() => useOperator(), { wrapper });
    await flush();
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(true);
  });

  it("picks up new scopes when the document becomes visible", async () => {
    tokenChangesAfterFirstCall();
    const { result } = renderHook(() => useOperator(), { wrapper });
    await flush();
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(false);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(result.current.can(SCOPE_PLANNER_ADVISE)).toBe(true);
  });

  it("does not re-render or change the context value when scopes are unchanged", async () => {
    // Same scopes, different order, fresh token each call.
    clerk.getToken
      .mockResolvedValueOnce(jwtWith({ scope: "fleet:control planner:advise" }))
      .mockResolvedValue(jwtWith({ scope: "planner:advise fleet:control" }));
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useOperator();
      },
      { wrapper },
    );
    await flush();
    const first = result.current;
    const rendersBefore = renders;

    await tick(60_000);
    await tick(60_000);

    expect(clerk.getToken.mock.calls.length).toBeGreaterThan(2);
    expect(renders).toBe(rendersBefore);
    expect(result.current).toBe(first);
  });

  it("stops polling and removes listeners on unmount", async () => {
    clerk.getToken.mockResolvedValue(jwtWith({ scope: "fleet:control" }));
    const { unmount } = renderHook(() => useOperator(), { wrapper });
    await flush();
    const calls = clerk.getToken.mock.calls.length;

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await tick(180_000);
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();

    expect(clerk.getToken.mock.calls.length).toBe(calls);
  });

  it("clears scopes and stops polling on sign-out", async () => {
    clerk.getToken.mockResolvedValue(jwtWith({ scope: "fleet:control" }));
    const { result, rerender } = renderHook(() => useOperator(), { wrapper });
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(true);

    clerk.isSignedIn = false;
    rerender();
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a token that resolves after sign-out", async () => {
    let resolve: (token: string) => void = () => undefined;
    clerk.getToken.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const { result, rerender } = renderHook(() => useOperator(), { wrapper });
    await flush();

    clerk.isSignedIn = false;
    rerender();
    await flush();
    act(() => { resolve(jwtWith({ scope: "fleet:control" })); });
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(false);

    // Signing back in must not surface the late token while the new one is pending.
    clerk.getToken = vi.fn(() => new Promise(() => undefined));
    clerk.isSignedIn = true;
    rerender();
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(false);
  });

  // The scopes read for one account must not outlive its session: after a
  // sign-out and a sign-in as someone else, can() is false until the new token
  // has actually been read.
  const strictWrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <OperatorProvider>{children}</OperatorProvider>
    </StrictMode>
  );
  it.each([
    ["plain", wrapper],
    ["StrictMode", strictWrapper],
  ])("forgets the previous session's scopes on sign-out (%s)", async (_name, w) => {
    clerk.getToken.mockResolvedValue(jwtWith({ scope: "fleet:control" }));
    const { result, rerender } = renderHook(() => useOperator(), { wrapper: w });
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(true);

    clerk.isSignedIn = false;
    rerender();
    await flush();

    // Signed back in, but the new token is still pending.
    clerk.getToken = vi.fn(() => new Promise(() => undefined));
    clerk.isSignedIn = true;
    rerender();
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(false);
  });

  it("keeps the last known scopes when a refresh fails", async () => {
    clerk.getToken
      .mockResolvedValueOnce(jwtWith({ scope: "fleet:control" }))
      .mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useOperator(), { wrapper });
    await flush();
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(true);

    await tick(60_000);

    expect(clerk.getToken.mock.calls.length).toBeGreaterThan(1);
    expect(result.current.can(SCOPE_FLEET_CONTROL)).toBe(true);
  });

  it("does not re-read when the tab becomes hidden", async () => {
    clerk.getToken.mockResolvedValue(jwtWith({ scope: "fleet:control" }));
    renderHook(() => useOperator(), { wrapper });
    await flush();
    const calls = clerk.getToken.mock.calls.length;

    const spy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    spy.mockRestore();

    expect(clerk.getToken.mock.calls.length).toBe(calls);
  });

  it("never reports a scope on a render where the operator is signed out", async () => {
    clerk.getToken.mockResolvedValue(jwtWith({ scope: "fleet:control" }));
    const seen: { signedIn: boolean; can: boolean }[] = [];
    const { rerender } = renderHook(
      () => {
        const op = useOperator();
        seen.push({ signedIn: op.isSignedIn, can: op.can(SCOPE_FLEET_CONTROL) });
        return op;
      },
      { wrapper },
    );
    await flush();
    expect(seen.some((r) => r.signedIn && r.can)).toBe(true);

    clerk.isSignedIn = false;
    rerender();
    await flush();

    const signedOut = seen.filter((r) => !r.signedIn);
    expect(signedOut.length).toBeGreaterThan(0);
    expect(signedOut.every((r) => !r.can)).toBe(true);
  });
});
