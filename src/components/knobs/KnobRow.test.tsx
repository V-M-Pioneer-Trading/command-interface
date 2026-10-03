import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Knob } from "../../api/types";
import { KnobRow } from "./KnobRow";

const knob = (value: number): Knob => ({ name: "minMargin", value, min: 0, max: 10, default: 3 });

function show(value: number) {
  const ui = (k: Knob) => <KnobRow knob={k} onSave={vi.fn()} busy={false} />;
  const view = render(ui(knob(value)));
  const input = () => screen.getByRole<HTMLInputElement>("spinbutton");
  return { input, poll: (next: number) => { view.rerender(ui(knob(next))); } };
}

describe("KnobRow draft adoption", () => {
  afterEach(cleanup);

  it("adopts a new server value while the draft is untouched", () => {
    const { input, poll } = show(3);
    poll(5);
    expect(input().value).toBe("5");
  });

  it("leaves an unsaved draft alone when the server value moves", () => {
    const { input, poll } = show(3);
    fireEvent.change(input(), { target: { value: "7" } });
    poll(5);
    expect(input().value).toBe("7");
  });

  it("adopts the server value once it matches the draft (own save landed)", () => {
    const { input, poll } = show(3);
    fireEvent.change(input(), { target: { value: "7" } });
    poll(7);
    expect(input().value).toBe("7");
    // The draft is clean again, so the next server move is adopted too.
    poll(2);
    expect(input().value).toBe("2");
  });

  it("does not re-adopt on later renders after skipping a poll for a dirty draft", () => {
    const { input, poll } = show(3);
    fireEvent.change(input(), { target: { value: "7" } });
    poll(5);
    // Same server value again, draft changed back to the old baseline: still the user's.
    fireEvent.change(input(), { target: { value: "3" } });
    poll(5);
    expect(input().value).toBe("3");
  });
});
