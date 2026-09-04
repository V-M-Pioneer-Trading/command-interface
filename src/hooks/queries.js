import { useQuery } from "@tanstack/react-query";
import { agentService } from "../api/agentService";
import { navigationService } from "../api/navigationService";
import { fleetService } from "../api/fleetService";
import { automationService } from "../api/automationService";
import { healthService } from "../api/healthService";
import { useAuth } from "../context/AuthContext";
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
 * operator (auth-design.md decision 18 — no scope, just an authenticated
 * caller) holding a SpaceTraders token to forward.
 *
 * Gated here rather than only server-side so a visitor with neither credential
 * doesn't fire a doomed request on every poll interval. Every such query goes
 * through this helper so the rule lives in one place: five hand-written copies
 * of `enabled: isSignedIn && !!token` is five chances for a new query to
 * quietly miss one half of it.
 *
 * Both credentials are read from context here rather than passed in. They are
 * ambient facts about the session, and threading the game token down through
 * Dashboard → SystemMap → WaypointPopover as a prop while the Clerk token came
 * from context meant two halves of one concept travelling by different routes.
 */
function useGatedQuery({ key, queryFn, enabled = true, ...options }) {
  const { token } = useAuth();
  const { isSignedIn, getToken } = useOperator();
  return useQuery({
    ...options,
    queryKey: key(token),
    queryFn: async () => queryFn(token, await getToken()),
    enabled: isSignedIn && !!token && enabled,
  });
}

// Unauthenticated and unconditional — the dashboard has no login wall, so
// this never gates on a token the way the queries below do.
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
    queryFn: (token, authToken) => agentService.getAgent(token, authToken),
    refetchInterval: AGENT_POLL_MS,
  });
}

export function useShipsQuery() {
  return useGatedQuery({
    key: queryKeys.ships,
    queryFn: (token, authToken) => agentService.getShips(token, authToken),
    refetchInterval: SHIPS_POLL_MS,
  });
}

export function useContractsQuery() {
  return useGatedQuery({
    key: queryKeys.contracts,
    queryFn: (token, authToken) => agentService.getContracts(token, authToken),
    refetchInterval: CONTRACTS_POLL_MS,
  });
}

// Public — navigation-service serves its SQLite cache with no credential at
// all; the token, when present, only extends it to a live fetch-on-miss.
export function useSystemWaypointsQuery(systemSymbol) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.systemWaypoints(token, systemSymbol),
    queryFn: () => navigationService.getSystemWaypoints(token, systemSymbol),
    enabled: !!systemSymbol,
    staleTime: Infinity,
  });
}

export function useCooldownQuery(shipSymbol, { enabled = true } = {}) {
  return useGatedQuery({
    key: (token) => queryKeys.cooldown(token, shipSymbol),
    queryFn: (token, authToken) => fleetService.getCooldown(token, shipSymbol, authToken),
    enabled: !!shipSymbol && enabled,
    refetchInterval: COOLDOWN_POLL_MS,
  });
}

export function useCargoQuery(shipSymbol) {
  return useGatedQuery({
    key: (token) => queryKeys.cargo(token, shipSymbol),
    queryFn: (token, authToken) => fleetService.getCargo(token, shipSymbol, authToken),
    enabled: !!shipSymbol,
    select: (res) => res?.data ?? null,
  });
}

export function useMarketQuery(waypointSymbol, { enabled = true } = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.market(token, waypointSymbol),
    queryFn: () => navigationService.getMarket(token, waypointSymbol),
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
