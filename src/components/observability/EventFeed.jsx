import { formatEventDetail, formatEventTime } from "../../utils/eventLog";
import "./EventFeed.css";

export function EventFeed({ events }) {
  if (!events || events.length === 0) {
    return <div className="lcars-event-feed__empty">No events yet</div>;
  }

  return (
    <ul className="lcars-event-feed">
      {events.map((e) => (
        <li key={e.id} className="lcars-event-feed__row">
          <span className="lcars-event-feed__time">{formatEventTime(e.occurredAt)}</span>
          <span className="lcars-event-feed__type">{e.type}</span>
          {formatEventDetail(e.detail) && (
            <span className="lcars-event-feed__detail">{formatEventDetail(e.detail)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
