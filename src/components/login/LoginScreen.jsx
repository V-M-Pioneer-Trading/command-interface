import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { agentService } from "../../api/agentService";
import { PillButton } from "../common/PillButton";
import { SystemStatus } from "../layout/SystemStatus";
import "./LoginScreen.css";

export function LoginScreen() {
  const { setToken } = useAuth();
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setChecking(true);
    setError(null);
    try {
      await agentService.getAgent(trimmed);
      setToken(trimmed);
    } catch (err) {
      setError(err.message || "Token rejected by agent-service");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="lcars-login">
      <div className="lcars-login__panel">
        <div className="lcars-login__header">
          <div className="lcars-login__elbow" />
          <h1>V&amp;M Command Interface</h1>
        </div>
        <form className="lcars-login__form" onSubmit={handleSubmit}>
          <label htmlFor="token-input">SpaceTraders access token</label>
          <textarea
            id="token-input"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your SpaceTraders bearer token here"
            disabled={checking}
          />
          {error && <div className="lcars-login__error">{error}</div>}
          <PillButton type="submit" accent="orange" disabled={checking || !draft.trim()}>
            {checking ? "Verifying..." : "Authenticate"}
          </PillButton>
        </form>
        <div className="lcars-login__status">
          <SystemStatus />
        </div>
      </div>
    </div>
  );
}
