import { useSignIn, useUser } from "@clerk/clerk-react";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../hooks/useOperator";
import { PillButton } from "../common/PillButton";
import "./OperatorBadge.css";

/**
 * Operator sign-in, rendered in the app chrome.
 *
 * Deliberately **headless** — no Clerk component appears on screen. The
 * instance offers Google only, so signing in is one button and a redirect:
 * there is no form to theme, no password field, and no fight with Clerk's
 * appearance API to make a hosted form look like LCARS. It also means no
 * "Secured by Clerk" badge, which is a paid feature that stops mattering when
 * nothing of Clerk's renders.
 */
export function OperatorBadge() {
  const { isLoaded, isSignedIn, signOut, can } = useOperator();
  const { signIn } = useSignIn();
  const { user } = useUser();

  if (!isLoaded) return <span className="lcars-operator lcars-operator--loading">…</span>;

  if (!isSignedIn) {
    return (
      <div className="lcars-operator">
        <span className="lcars-operator__label">OBSERVER</span>
        <PillButton
          accent="orange"
          title="Sign in to arm, pause, abort or retune the autopilot"
          onClick={() =>
            signIn?.authenticateWithRedirect({
              strategy: "oauth_google",
              redirectUrl: window.location.href,
              redirectUrlComplete: window.location.href,
            })
          }
        >
          Operator sign-in
        </PillButton>
      </div>
    );
  }

  const hasControl = can(SCOPE_FLEET_CONTROL);
  const name = user?.primaryEmailAddress?.emailAddress || user?.fullName || "operator";

  return (
    <div className="lcars-operator">
      <span className={`lcars-operator__label${hasControl ? " lcars-operator__label--control" : ""}`}>
        {hasControl ? "OPERATOR" : "SIGNED IN"}
      </span>
      <span className="lcars-operator__name" title={name}>
        {name}
      </span>
      {/* Signed in without the scope is a real state, not an error: the account
          exists but carries no fleet:control in its public_metadata. Saying so
          beats silently disabled controls with no explanation. */}
      {!hasControl && (
        <span className="lcars-operator__note" title="This account has no fleet:control scope">
          no control scope
        </span>
      )}
      <PillButton accent="red" onClick={() => signOut()}>
        Sign out
      </PillButton>
    </div>
  );
}
