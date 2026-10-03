import { useState, type FormEvent } from "react";
import type { Knob } from "../../api/types";

function outOfRange(value: number, knob: Knob): boolean {
  return !Number.isFinite(value) || value < knob.min || value > knob.max;
}

/**
 * `baseline` is the last server value this row's draft is considered clean
 * against. When the 15s poll brings a new knob.value, we only adopt it into
 * `draft` if the user's draft either already matches it (their own save just
 * landed) or the draft was untouched — a draft that diverges from baseline
 * for a reason other than the incoming value is left alone, so a concurrent
 * edit by another operator/AI never silently overwrites unsaved local input.
 */
export function KnobRow({
  knob,
  onSave,
  busy,
}: {
  knob: Knob;
  onSave: (name: string, value: number) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(String(knob.value));
  const [baseline, setBaseline] = useState(knob.value);
  // The server value this row last reacted to; a change in `knob.value` is the
  // one moment `baseline` and `draft` are reconciled.
  const [seenValue, setSeenValue] = useState(knob.value);

  const parsed = Number(draft);
  const invalid = draft.trim() === "" || outOfRange(parsed, knob);
  const dirty = parsed !== baseline;

  // Adjusting state while rendering (react.dev "You Might Not Need an Effect"):
  // React re-renders this component at once with the new state, before any
  // child renders or the browser paints, so there is no frame showing the old
  // draft beside the new server value. Runs only when `knob.value` changed.
  if (knob.value !== seenValue) {
    setSeenValue(knob.value);
    if (knob.value !== baseline && (parsed === knob.value || !dirty)) {
      setDraft(String(knob.value));
      setBaseline(knob.value);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid || !dirty) return;
    onSave(knob.name, parsed);
  };

  return (
    <li className="lcars-knob-row">
      <div className="lcars-knob-row__header">
        <span className="lcars-knob-row__name">{knob.name}</span>
        <span className="lcars-knob-row__bounds">
          [{knob.min}, {knob.max}] · default {knob.default}
        </span>
      </div>
      {knob.description && <p className="lcars-knob-row__description">{knob.description}</p>}
      <form className="lcars-knob-row__form" onSubmit={submit}>
        <input
          type="number"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          disabled={busy}
          step="any"
          className={`lcars-knob-row__input ${invalid ? "is-invalid" : ""}`}
        />
        <button type="submit" className="lcars-knob-row__save" disabled={busy || invalid || !dirty}>
          Save
        </button>
      </form>
      {invalid && (
        <div className="lcars-knob-row__error">
          Must be a number between {knob.min} and {knob.max}
        </div>
      )}
    </li>
  );
}
