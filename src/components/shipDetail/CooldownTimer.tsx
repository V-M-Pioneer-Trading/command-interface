import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../utils/spaceTraders";
import type { CooldownResponse } from "../../api/types";

export function CooldownTimer({ cooldown }: { cooldown: CooldownResponse["data"] | undefined }) {
  const remaining = useCountdown(cooldown?.expiration);
  if (!cooldown || remaining <= 0) return null;

  return (
    <div className="lcars-cooldown">
      COOLDOWN <strong>{formatCountdown(remaining)}</strong>
    </div>
  );
}
