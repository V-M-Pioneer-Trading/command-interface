import { MONITORED_SERVICES } from "../../api/healthService";
import { useSystemHealthQuery } from "../../hooks/queries";
import "./SystemStatus.css";

const UNKNOWN_SERVICES = MONITORED_SERVICES.map(({ key, label }) => ({
  key,
  label,
  status: "unknown",
}));

export function SystemStatus() {
  const { data: services } = useSystemHealthQuery();

  return (
    <div className="lcars-system-status">
      {(services ?? UNKNOWN_SERVICES).map(({ key, label, status }) => (
        <span key={key} className="lcars-system-status__item" title={`${label}: ${status}`}>
          <span className={`lcars-system-status__dot lcars-system-status__dot--${status}`} />
          <span className="lcars-system-status__label">{label}</span>
        </span>
      ))}
    </div>
  );
}
