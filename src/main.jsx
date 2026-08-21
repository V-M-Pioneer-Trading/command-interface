import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/fonts.css";
import "./styles/theme.css";
import "./styles/global.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Publishable keys are public by design — they name the instance and authorize
// nothing — so this is build configuration rather than a secret.
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!clerkPublishableKey) {
  // ClerkProvider throws without a key, and its message says nothing about
  // which variable or where to get it. Fail legibly instead: this is the first
  // wall anyone hits on a fresh clone, and the backends' committed dev keypair
  // deliberately does not cover the browser — minting a session needs Clerk's
  // own SDK, so a Clerk development instance is required here.
  root.render(
    <div style={{ padding: "2rem", fontFamily: "monospace", color: "#ff9c00", background: "#000", minHeight: "100vh" }}>
      <h1>VITE_CLERK_PUBLISHABLE_KEY is not set</h1>
      <p>Set it in `.env.local` to a Clerk development instance&apos;s publishable key (`pk_test_…`).</p>
      <p>
        Publishable keys are public by design. See `meta/dev-keys/README.md` — the committed development keypair covers
        the backend services only; the browser needs a real Clerk instance to mint a session.
      </p>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
        <QueryClientProvider client={queryClient}>
          <AlertProvider>
            {/* Two credentials coexist until increment 3. Clerk owns operator
                identity — who may arm, abort or retune. AuthProvider still owns
                the pasted SpaceTraders token, because agent/navigation/fleet
                remain pass-throughs until st-gateway starts injecting it. */}
            <AuthProvider>
              <App />
            </AuthProvider>
          </AlertProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}
