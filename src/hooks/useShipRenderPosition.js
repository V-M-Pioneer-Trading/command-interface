import { useEffect, useState } from "react";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Ship position for map rendering. Docked/in-orbit ships snap to their current
 * waypoint; in-transit ships are interpolated client-side between
 * route.origin/route.destination using departureTime/arrival, so motion stays
 * smooth between the ~12s ship-list polls.
 */
export function useShipRenderPosition(nav) {
  const [now, setNow] = useState(() => Date.now());
  const isTransiting = nav?.status === "IN_TRANSIT";

  useEffect(() => {
    if (!isTransiting) return undefined;
    let frame;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isTransiting]);

  if (!nav) return null;

  if (!isTransiting || !nav.route) {
    const wp = nav.route?.destination;
    return wp ? { x: wp.x, y: wp.y } : null;
  }

  const { origin, destination, departureTime, arrival } = nav.route;
  const start = new Date(departureTime).getTime();
  const end = new Date(arrival).getTime();
  const t = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;

  return {
    x: lerp(origin.x, destination.x, t),
    y: lerp(origin.y, destination.y, t),
  };
}
