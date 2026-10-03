import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountdown } from "./useCountdown";

const NOW = Date.parse("2026-01-01T00:00:00Z");
const at = (seconds: number) => new Date(NOW + seconds * 1000).toISOString();

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down once a second and stops at zero", () => {
    const { result } = renderHook(() => useCountdown(at(3)));
    expect(result.current).toBe(3);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(2);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe(0);
  });

  it("is 0 with no expiration", () => {
    expect(renderHook(() => useCountdown(null)).result.current).toBe(0);
  });

  it("switches to a new expiration, and to 0 when it is cleared", () => {
    const { result, rerender } = renderHook<number, { exp: string | null }>(({ exp }) => useCountdown(exp), {
      initialProps: { exp: at(10) },
    });
    rerender({ exp: at(60) });
    expect(result.current).toBe(60);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(59);
    rerender({ exp: null });
    expect(result.current).toBe(0);
  });
});
