import { config } from "./config";

// Every service here exposes an unauthenticated GET health check. It must work
// with no SpaceTraders token and no Clerk session — the dashboard renders for
// anonymous visitors — so it never routes through client.js's `request()` and
// never forwards Authorization.
//
// healthPath is explicit per service rather than derived from `url`: in
// production all backend origins share the spacetraders.radomskyi.com
// domain, routed by CloudFront path pattern, so a bare `/health` on every
// service would collapse to the same URL. Each backend also answers
// `/api/<service>/health` (unversioned — no /v1 — but scoped like the rest
// of its API surface) for exactly this reason. ai-service has no CloudFront
// origin in production (internal-only), so it keeps the bare path — it
// only ever resolves locally.
export const SERVICE_DEFINITIONS = [
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
  {
    key: "stGateway",
    label: "ST Gateway",
    url: config.stGatewayUrl,
    healthPath: "/api/st-gateway/health",
  },
  { key: "ai", label: "AI", url: config.aiServiceUrl, healthPath: "/health" },
];

/**
 * Drops services this page physically cannot probe.
 *
 * Every service URL falls back to a `http://localhost:*` default, and
 * ai-service has no production origin to override it with — so the deployed
 * https:// build was probing `http://localhost:3004`, which the browser blocks
 * as mixed content before it leaves the page. The dot went permanently red and
 * claimed a service was down that was, from here, simply not addressable.
 *
 * A red light nobody can act on is worse than no light, so an unprobeable
 * service is not listed at all.
 */
export function probeableServices(definitions, pageProtocol) {
  if (pageProtocol !== "https:") return definitions;
  return definitions.filter((service) => {
    try {
      return new URL(service.url).protocol === "https:";
    } catch {
      return false;
    }
  });
}

export const MONITORED_SERVICES = probeableServices(
  SERVICE_DEFINITIONS,
  globalThis.location?.protocol,
);

// A health check that never settles would stall the 10s poll forever and leave
// the dot showing whatever it showed last, which reads as "fine".
const PROBE_TIMEOUT_MS = 5_000;

function healthUrl(serviceUrl, healthPath) {
  return `${new URL(serviceUrl).origin}${healthPath}`;
}

async function checkOne({ key, label, url, healthPath }) {
  try {
    const res = await fetch(healthUrl(url, healthPath), {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return { key, label, status: res.ok ? "up" : "down" };
  } catch {
    return { key, label, status: "down" };
  }
}

export const healthService = {
  checkAll: () => Promise.all(MONITORED_SERVICES.map(checkOne)),
};
