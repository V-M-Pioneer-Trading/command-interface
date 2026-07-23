import { config } from "./config";

// Every service here exposes a bare, unauthenticated GET /health — this
// check must work before a SpaceTraders token exists (login screen) as well
// as after, so it never routes through client.js's `request()` (which
// requires a token) and never forwards Authorization.
export const MONITORED_SERVICES = [
  { key: "agent", label: "Agent", url: config.agentServiceUrl },
  { key: "navigation", label: "Navigation", url: config.navigationServiceUrl },
  { key: "fleet", label: "Fleet", url: config.fleetServiceUrl },
  { key: "automation", label: "Automation", url: config.automationServiceUrl },
  { key: "stGateway", label: "ST Gateway", url: config.stGatewayUrl },
  { key: "ai", label: "AI", url: config.aiServiceUrl },
];

// Service URLs above include their own versioned API path (e.g.
// `/api/agent/v1`) — /health is bare on every service, so strip down to the
// origin before appending it.
function healthUrl(serviceUrl) {
  return `${new URL(serviceUrl).origin}/health`;
}

async function checkOne({ key, label, url }) {
  try {
    const res = await fetch(healthUrl(url));
    return { key, label, status: res.ok ? "up" : "down" };
  } catch {
    return { key, label, status: "down" };
  }
}

export const healthService = {
  checkAll: () => Promise.all(MONITORED_SERVICES.map(checkOne)),
};
