import { useEffect, useState } from "react";

export function useCountdown(expiration) {
  const [remaining, setRemaining] = useState(() => computeRemaining(expiration));

  useEffect(() => {
    setRemaining(computeRemaining(expiration));
    if (!expiration) return undefined;
    const interval = setInterval(() => {
      setRemaining(computeRemaining(expiration));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiration]);

  return remaining;
}

function computeRemaining(expiration) {
  if (!expiration) return 0;
  return Math.max(0, (new Date(expiration).getTime() - Date.now()) / 1000);
}
