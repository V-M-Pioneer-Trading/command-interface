import { useEffect, useState } from "react";

export function useCountdown(expiration: string | null | undefined): number {
  const [remaining, setRemaining] = useState(() => computeRemaining(expiration));
  const [countedFor, setCountedFor] = useState(expiration);

  // A new expiration is reflected on the render that receives it, not one
  // effect later: React re-renders at once with the recomputed value.
  if (expiration !== countedFor) {
    setCountedFor(expiration);
    setRemaining(computeRemaining(expiration));
  }

  useEffect(() => {
    if (!expiration) return undefined;
    const interval = setInterval(() => {
      setRemaining(computeRemaining(expiration));
    }, 1000);
    return () => { clearInterval(interval); };
  }, [expiration]);

  return remaining;
}

function computeRemaining(expiration: string | null | undefined): number {
  if (!expiration) return 0;
  return Math.max(0, (new Date(expiration).getTime() - Date.now()) / 1000);
}
