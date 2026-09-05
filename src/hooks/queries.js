import { useQuery } from "@tanstack/react-query";
import { agentService } from "../api/agentService";
import { navigationService } from "../api/navigationService";
import { fleetService } from "../api/fleetService";
import { automationService } from "../api/automationService";
import { healthService } from "../api/healthService";
import { useOperator } from "../context/OperatorContext";
import { queryKeys } from "./queryKeys";

const SYSTEM_HEALTH_POLL_MS = 10_000;
const SHIPS_POLL_MS = 12_000;
const AGENT_POLL_MS = 20_000;
const CONTRACTS_POLL_MS = 30_000;
const COOLDOWN_POLL_MS = 5_000;
const MARKET_POLL_MS = 30_000;
const AUTOPILOT_STATUS_POLL_MS = 5_000;
const SHIP_TASK_POLL_MS = 5_000;
const METRICS_CONTEXT_POLL_MS = 15_000;
const ANOMALIES_DIGEST_POLL_MS = 15_000;
const KNOBS_POLL_MS = 15_000;

/**
 * A read that agent-service or fleet-service will only answer for a signed-in
 * operator: no scope, just an authenticated caller (auth-design.md decision 3 —
 * these are reads about the one account the fleet plays, so not anonymous,
 * though they move nothing).
 *
 * Gated here rather than only server-side so a visitor doesn't fire a doomed
 * request on every poll interval. Every such query goes through this helper so
 * the rule lives in one place.
 */
function useGatedQuery({ key, queryFn, enabled = true, ...options }) {
  const { isSignedIn, getToken } = useOperator();
  return useQuery({
    ...options,
    queryKey: key(),
    queryFn: async () => queryFn(await getToken()),
    enabled: isSignedIn && enabled,
  });
}


// Unauthenticated and unconditional — the dashboard has no login wall, so
// this never gates on a session the way the queries below do.
export function useSystemHealthQuery() {
  return useQuery({
    queryKey: queryKeys.systemHealth(),
    queryFn: () => healthService.checkAll(),
    refetchInterval: SYSTEM_HEALTH_POLL_MS,
  });
}

export function useAgentQuery() {
  return useGatedQuery({
    key: queryKeys.agent,
    queryFn: (authToken) => agentService.getAgent(authToken),
    refetchInterval: AGENT_POLL_MS,
  });
}

export function useShipsQuery() {
  return useGatedQuery({
    key: queryKeys.ships,
    queryFn: (authToken) => agentService.getShips(authToken),
    refetchInterval: SHIPS_POLL_MS,
  });
}

export function useContractsQuery() {
  return useGatedQuery({
    key: queryKeys.contracts,
    queryFn: (authToken) => agentService.getContracts(authToken),
    refetchInterval: CONTRACTS_POLL_MS,
  });
}

// Public — navigation-service serves its SQLite cache to anyone; a session,
// when there is one, only extends that to a live fetch-on-miss. So this fires
// for a visitor too, and the map draws before anyone signs in.
export function useSystemWaypointsQuery(systemSymbol) {
  const { getToken } = useOperator();
  return useQuery({
    queryKey: queryKeys.systemWaypoints(systemSymbol),
    queryFn: async () => navigationService.getSystemWaypoints(systemSymbol, await getToken()),

    enabled: !!systemSymbol,
    staleTime: Infinity,
  });
}

export function useCooldownQuery(shipSymbol, { enabled = true } = {}) {
  return useGatedQuery({
    key: () => queryKeys.cooldown(shipSymbol),
    queryFn: (authToken) => fleetService.getCooldown(shipSymbol, authToken),
    enabled: !!shipSymbol && enabled,
    refetchInterval: COOLDOWN_POLL_MS,
  });
}

export function useCargoQuery(shipSymbol) {
  return useGatedQuery({
    key: () => queryKeys.cargo(shipSymbol),
    queryFn: (authToken) => fleetService.getCargo(shipSymbol, authToken),
    enabled: !!shipSymbol,
    select: (res) => res?.data ?? null,
  });
}

export function useMarketQuery(waypointSymbol, { enabled = true } = {}) {
  const { getToken } = useOperator();
  return useQuery({
    queryKey: queryKeys.market(waypointSymbol),
    queryFn: async () => navigationService.getMarket(waypointSymbol, await getToken()),

    enabled: !!waypointSymbol && enabled,
    refetchInterval: MARKET_POLL_MS,
  });
}

export function useAutopilotStatusQuery() {
  return useQuery({
    queryKey: queryKeys.autopilotStatus(),
    queryFn: () => automationService.getStatus(),
    refetchInterval: AUTOPILOT_STATUS_POLL_MS,
  });
}

// 404 ("no task for this ship yet") resolves to `null` rather than an error —
// a ship automation-service isn't managing is a normal state for this query,
// not a failure worth react-query's retry/error-boundary treatment. A real
// error here fans out per ship in the fleet list, so retries are capped at 1
// (rather than react-query's default 3x backoff) to avoid a struggling
// automation-service getting hit by N ships' worth of stacked retries on top
// of the fixed 5s poll.
export function useShipTaskQuery(shipSymbol) {
  return useQuery({
    queryKey: queryKeys.shipTask(shipSymbol),
    queryFn: () => automationService.getShipTask(shipSymbol),
    enabled: !!shipSymbol,
    retry: 1,
    refetchInterval: SHIP_TASK_POLL_MS,
  });
}

// `null` means metrics rollups aren't configured on this deployment (the
// route doesn't exist), not an error — same treatment as useShipTaskQuery's 404.
export function useMetricsContextQuery(params) {
  return useQuery({
    queryKey: queryKeys.metricsContext(params),
    queryFn: () => automationService.getMetricsContext(params),
    refetchInterval: METRICS_CONTEXT_POLL_MS,
  });
}

// `null` means anomaly detection isn't configured (no webhook set) — same
// "feature not enabled" treatment as useMetricsContextQuery.
export function useAnomaliesDigestQuery(params) {
  return useQuery({
    queryKey: queryKeys.anomaliesDigest(params),
    queryFn: () => automationService.getAnomaliesDigest(params),
    refetchInterval: ANOMALIES_DIGEST_POLL_MS,
  });
}

export function useKnobsQuery() {
  return useQuery({
    queryKey: queryKeys.knobs(),
    queryFn: () => automationService.getKnobs(),
    refetchInterval: KNOBS_POLL_MS,
  });
}
