import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "spacetraders_token";

/**
 * The pasted SpaceTraders game token, held in `sessionStorage` (cleared when
 * the tab closes) and forwarded as-is to agent/navigation/fleet-service.
 *
 * `initialToken` seeds a token for a tree that has no operator to paste one —
 * the dev map harness. It is only a fallback: a token already in
 * `sessionStorage` wins, and nothing is written back on that path.
 */
export function AuthProvider({ children, initialToken = null }) {
  const [token, setTokenState] = useState(() => sessionStorage.getItem(STORAGE_KEY) || initialToken);

  const setToken = (value) => {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, value);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setTokenState(value);
  };

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
