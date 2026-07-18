import { formatEventDetail, formatEventTime } from "../../utils/eventLog";
import "./AnomalyLog.css";

export function AnomalyLog({ anomalies }) {
  if (!anomalies || anomalies.length === 0) {
    return <div className="lcars-anomaly-log__empty">No anomalies</div>;
  }

  return (
    <ul className="lcars-anomaly-log">
      {anomalies.map((a) => (
        <li key={a.id} className="lcars-anomaly-log__row">
          <div className="lcars-anomaly-log__header">
            <span className="lcars-anomaly-log__type">{a.type}</span>
            <span className="lcars-anomaly-log__time">{formatEventTime(a.detectedAt)}</span>
          </div>
          {formatEventDetail(a.detail) && (
            <div className="lcars-anomaly-log__detail">{formatEventDetail(a.detail)}</div>
          )}
          <span className={`lcars-anomaly-log__delivery ${a.deliveredAt ? "is-delivered" : "is-pending"}`}>
            {a.deliveredAt ? "Delivered" : `Pending (${a.deliveryAttempts} attempt${a.deliveryAttempts === 1 ? "" : "s"})`}
          </span>
        </li>
      ))}
    </ul>
  );
}
