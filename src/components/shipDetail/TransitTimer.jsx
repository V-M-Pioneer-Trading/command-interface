import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../utils/spaceTraders";

export function TransitTimer({ nav }) {
  const arrival = nav?.status === "IN_TRANSIT" ? nav?.route?.arrival : null;
  const remaining = useCountdown(arrival);
  if (!arrival || remaining <= 0) return null;

  return (
    <div className="lcars-transit-timer">
      ETA <strong>{formatCountdown(remaining)}</strong>
    </div>
  );
}
