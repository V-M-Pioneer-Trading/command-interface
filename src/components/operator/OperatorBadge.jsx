import { useEffect, useRef } from "react";
import { useSignIn, useSignUp, useUser } from "@clerk/clerk-react";
import { useAlerts } from "../../context/AlertContext";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../context/OperatorContext";
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
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { user } = useUser();
  const { pushAlert } = useAlerts();
  const transferAttempted = useRef(false);

  useEffect(() => {
    if (!signInLoaded || !signUpLoaded || isSignedIn || transferAttempted.current) return;
    // A brand-new Google account has no existing Clerk user for signIn to find.
    // Clerk marks that attempt "transferable" instead of erroring outright —
    // completing it means creating the account here, explicitly, through the
    // sign-up object. Without this the redirect just bounces back to this same
    // page with no session and no error, which is indistinguishable from a
    // silent failure.
    if (signIn?.firstFactorVerification?.status !== "transferable") return;

    transferAttempted.current = true;
    signUp
      .create({ transfer: true })
      .then((attempt) => {
        if (attempt.status === "complete") {
          return setActive({ session: attempt.createdSessionId });
        }
        // Anything other than "complete" means Clerk wants a step this headless
        // flow does not render. Saying so beats the redirect quietly landing
        // back here with no session and no explanation.
        throw new Error(`Sign-up needs another step (${attempt.status})`);
      })
      .catch((err) => pushAlert(err?.errors?.[0]?.message || err?.message || "Sign-in failed"));
  }, [signInLoaded, signUpLoaded, isSignedIn, signIn, signUp, setActive, pushAlert]);

  if (!isLoaded) return <span className="lcars-operator lcars-operator--loading">…</span>;

  if (!isSignedIn) {
    return (
      <div className="lcars-operator">
        <span className="lcars-operator__label">OBSERVER</span>
        <PillButton
          accent="orange"
          title="Sign in to arm, pause, abort or retune the autopilot"
          onClick={() =>
            signIn
              ?.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: window.location.href,
                redirectUrlComplete: window.location.href,
              })
              .catch((err) => pushAlert(err?.errors?.[0]?.message || "Could not start sign-in"))
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
