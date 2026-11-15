import { describe, expect, it } from "vitest";
import { errorMessage } from "./client";

describe("errorMessage", () => {
  it("reads flat { error }, flat { message } and nested { error: { message } }", () => {
    expect(errorMessage({ error: "a" }, "S")).toBe("a");
    expect(errorMessage({ message: "b" }, "S")).toBe("b");
    expect(errorMessage({ error: { message: "c" } }, "S")).toBe("c");
  });

  it("prefers error over message, and skips an empty one", () => {
    expect(errorMessage({ error: "a", message: "b" }, "S")).toBe("a");
    expect(errorMessage({ error: "", message: "b" }, "S")).toBe("b");
  });

  it("falls back to statusText for anything that is not an object with a usable message", () => {
    for (const body of [null, undefined, "plain text", ["x"], 42, {}, { error: null }, { error: {} }, { error: 5 }]) {
      expect(errorMessage(body, "Teapot")).toBe("Teapot");
    }
  });
});
