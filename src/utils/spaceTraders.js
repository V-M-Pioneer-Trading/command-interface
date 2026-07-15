export function systemSymbolFromWaypoint(waypointSymbol) {
  if (!waypointSymbol) return null;
  return waypointSymbol.split("-").slice(0, 2).join("-");
}

export function formatCountdown(seconds) {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
