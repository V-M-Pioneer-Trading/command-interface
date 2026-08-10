import { useEffect, useState } from "react";

/**
 * One shared rAF clock for the whole map.
 *
 * In-transit ships are interpolated client-side between route origin/arrival so
 * motion stays smooth between the ~12s ship-list polls. Previously each ship
 * marker ran its own rAF loop and set its own state — N ships meant N loops and
 * N re-renders per frame. The map now ticks once and passes `now` down, and
 * stops ticking entirely when nothing is moving.
 */
export function useAnimationClock(active) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return now;
}
