import "./StatusPill.css";

const STATUS_CLASS = {
  DOCKED: "status-docked",
  IN_ORBIT: "status-in-orbit",
  IN_TRANSIT: "status-in-transit",
};

export function StatusPill({ status }) {
  const cls = STATUS_CLASS[status] || "status-unknown";
  return <span className={`lcars-status-pill ${cls}`}>{status}</span>;
}
