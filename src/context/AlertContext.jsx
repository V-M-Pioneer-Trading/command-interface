import { createContext, useCallback, useContext, useRef, useState } from "react";

const AlertContext = createContext(null);

let nextId = 1;

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushAlert = useCallback(
    (message, { severity = "error", sticky = false, timeoutMs = 6000 } = {}) => {
      const id = nextId++;
      setAlerts((prev) => [...prev, { id, message, severity }]);
      if (!sticky) {
        const timer = setTimeout(() => dismiss(id), timeoutMs);
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

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}
