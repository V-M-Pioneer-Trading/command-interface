import { useAlerts } from "../../context/AlertContext";
import "./AlertBanner.css";

export function AlertBanner() {
  const { alerts, dismiss } = useAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="lcars-alert-stack">
      {alerts.map((alert) => (
        <div key={alert.id} className={`lcars-alert lcars-alert--${alert.severity}`}>
          <span className="lcars-alert__text">{alert.message}</span>
          <button
            type="button"
            className="lcars-alert__dismiss"
            onClick={() => dismiss(alert.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
