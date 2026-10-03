import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertContext, type Alert, type PushAlertOptions } from "./AlertContext";

let nextId = 1;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushAlert = useCallback(
    (message: string, { severity = "error", sticky = false, timeoutMs = 6000 }: PushAlertOptions = {}) => {
      const id = nextId++;
      setAlerts((prev) => [...prev, { id, message, severity }]);
      if (!sticky) {
        const timer = setTimeout(() => { dismiss(id); }, timeoutMs);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <AlertContext.Provider value={{ alerts, pushAlert, dismiss }}>
      {children}
    </AlertContext.Provider>
  );
}
