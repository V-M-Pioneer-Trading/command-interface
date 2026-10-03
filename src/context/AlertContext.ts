import { createContext, useContext } from "react";

export type AlertSeverity = "error" | "info";

export interface Alert {
  id: number;
  message: string;
  severity: AlertSeverity;
}

export interface PushAlertOptions {
  severity?: AlertSeverity;
  sticky?: boolean;
  timeoutMs?: number;
}

export interface AlertContextValue {
  alerts: Alert[];
  pushAlert: (message: string, options?: PushAlertOptions) => number;
  dismiss: (id: number) => void;
}

// The context and its hook live here, the provider component in
// AlertProvider.tsx: react-refresh needs a file that exports components to
// export nothing else.
export const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}
