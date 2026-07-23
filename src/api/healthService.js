import { config } from "./config";

// Every service here exposes an unauthenticated GET health check — this
// check must work before a SpaceTraders token exists (login screen) as well
// as after, so it never routes through client.js's `request()` (which
// requires a token) and never forwards Authorization.
//
// healthPath is explicit per service rather than derived from `url`: in
// production all four backend origins share the spacetraders.radomskyi.com
// domain, routed by CloudFront path pattern, so a bare `/health` on every
// service would collapse to the same URL. Each backend also answers
// `/api/<service>/health` (unversioned — no /v1 — but scoped like the rest
// of its API surface) for exactly this reason. st-gateway and ai-service
// have no CloudFront origin in production (internal-only), so they keep the
// bare path — it only ever resolves locally.
export const MONITORED_SERVICES = [
  { key: "agent", label: "Agent", url: config.agentServiceUrl, healthPath: "/api/agent/health" },
  {
    key: "navigation",
    label: "Navigation",
    url: config.navigationServiceUrl,
    healthPath: "/api/navigation/health",
  },
  { key: "fleet", label: "Fleet", url: config.fleetServiceUrl, healthPath: "/api/fleet/health" },
  {
    key: "automation",
    label: "Automation",
    url: config.automationServiceUrl,
    healthPath: "/api/automation/health",
  },
  { key: "stGateway", label: "ST Gateway", url: config.stGatewayUrl, healthPath: "/health" },
  { key: "ai", label: "AI", url: config.aiServiceUrl, healthPath: "/health" },
];

function healthUrl(serviceUrl, healthPath) {
  return `${new URL(serviceUrl).origin}${healthPath}`;
}

async function checkOne({ key, label, url, healthPath }) {
  try {
    const res = await fetch(healthUrl(url, healthPath));
    return { key, label, status: res.ok ? "up" : "down" };
  } catch {
    return { key, label, status: "down" };
  }
}

export const healthService = {
  checkAll: () => Promise.all(MONITORED_SERVICES.map(checkOne)),
};
