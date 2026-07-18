/** An event/anomaly `detail` is arbitrary JSON from automation-service — the
 * logged reason itself, shown as plain key=value text rather than decoration. */
export function formatEventDetail(detail) {
  if (!detail || Object.keys(detail).length === 0) return null;
  return Object.entries(detail)
    .map(([key, value]) => `${key}=${typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(", ");
}

export function formatEventTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
