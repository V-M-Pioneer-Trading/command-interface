import { useState, useEffect, useRef } from "react";

function outOfRange(value, knob) {
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
export function KnobRow({ knob, onSave, busy }) {
  const [draft, setDraft] = useState(String(knob.value));
  const baseline = useRef(knob.value);

  const parsed = Number(draft);
  const invalid = draft.trim() === "" || outOfRange(parsed, knob);
  const dirty = parsed !== baseline.current;

  useEffect(() => {
    if (knob.value === baseline.current) return;
    if (Number(draft) === knob.value || !dirty) {
      setDraft(String(knob.value));
      baseline.current = knob.value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knob.value]);

  const submit = (e) => {
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
      <form className="lcars-knob-row__form" onSubmit={submit}>
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
