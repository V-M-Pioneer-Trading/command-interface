import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PillButton } from "../common/PillButton";
import "./GameTokenBadge.css";

/**
 * Small chrome affordance for the pasted SpaceTraders game token.
 *
 * This is not a login gate — the dashboard renders with or without it
 * (auth-design.md decision 13). It still exists because navigation/agent/
 * fleet-service hold no SpaceTraders credential of their own and forward
 * whatever arrives in X-SpaceTraders-Token; that stops being true only once
 * auth-service and st-gateway injection (decision 5) ship, at which point
 * this component's job disappears with it (decision 18).
 */
export function GameTokenBadge() {
  const { token, setToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <div className="lcars-game-token">
        <span className={`lcars-game-token__label${token ? " lcars-game-token__label--set" : ""}`}>
          {token ? "GAME TOKEN SET" : "NO GAME TOKEN"}
        </span>
        <PillButton
          accent="tan"
          onClick={() => {
            setDraft(token || "");
            setEditing(true);
          }}
        >
          {token ? "Change" : "Set Token"}
        </PillButton>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    setToken(trimmed || null);
    setEditing(false);
  };

  return (
    <form className="lcars-game-token lcars-game-token--editing" onSubmit={submit}>
      <textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Paste SpaceTraders token"
        autoFocus
      />
      <PillButton type="submit" accent="orange">
        Save
      </PillButton>
      <PillButton type="button" accent="red" onClick={() => setEditing(false)}>
        Cancel
      </PillButton>
    </form>
  );
}
