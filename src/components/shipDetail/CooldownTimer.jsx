import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../utils/spaceTraders";

export function CooldownTimer({ cooldown }) {
  const remaining = useCountdown(cooldown?.expiration);
  if (!cooldown || remaining <= 0) return null;

  return (
    <div className="lcars-cooldown">
      COOLDOWN <strong>{formatCountdown(remaining)}</strong>
    </div>
  );
}
