import { useQuery } from "@tanstack/react-query";
import { agentService } from "../api/agentService";
import { navigationService } from "../api/navigationService";
import { fleetService } from "../api/fleetService";
import { automationService } from "../api/automationService";

const SHIPS_POLL_MS = 12_000;
const AGENT_POLL_MS = 20_000;
const CONTRACTS_POLL_MS = 30_000;
const COOLDOWN_POLL_MS = 5_000;
const MARKET_POLL_MS = 30_000;
const AUTOPILOT_STATUS_POLL_MS = 5_000;
const SHIP_TASK_POLL_MS = 5_000;
const METRICS_CONTEXT_POLL_MS = 15_000;
const ANOMALIES_DIGEST_POLL_MS = 15_000;

export function useAgentQuery(token) {
  return useQuery({
    queryKey: ["agent", token],
    queryFn: () => agentService.getAgent(token),
    enabled: !!token,
    refetchInterval: AGENT_POLL_MS,
  });
}

export function useShipsQuery(token) {
  return useQuery({
    queryKey: ["ships", token],
    queryFn: () => agentService.getShips(token),
    enabled: !!token,
    refetchInterval: SHIPS_POLL_MS,
  });
}

export function useContractsQuery(token) {
  return useQuery({
    queryKey: ["contracts", token],
    queryFn: () => agentService.getContracts(token),
    enabled: !!token,
    refetchInterval: CONTRACTS_POLL_MS,
  });
}

export function useSystemWaypointsQuery(token, systemSymbol) {
  return useQuery({
    queryKey: ["systemWaypoints", token, systemSymbol],
    queryFn: () => navigationService.getSystemWaypoints(token, systemSymbol),
    enabled: !!token && !!systemSymbol,
    staleTime: Infinity,
  });
}

export function useCooldownQuery(token, shipSymbol, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["cooldown", token, shipSymbol],
    queryFn: () => fleetService.getCooldown(token, shipSymbol),
    enabled: !!token && !!shipSymbol && enabled,
    refetchInterval: COOLDOWN_POLL_MS,
  });
}

export function useCargoQuery(token, shipSymbol) {
  return useQuery({
    queryKey: ["cargo", token, shipSymbol],
    queryFn: () => fleetService.getCargo(token, shipSymbol),
    enabled: !!token && !!shipSymbol,
    select: (res) => res?.data ?? null,
  });
}

export function useMarketQuery(token, waypointSymbol, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["market", token, waypointSymbol],
    queryFn: () => navigationService.getMarket(token, waypointSymbol),
    enabled: !!token && !!waypointSymbol && enabled,
    refetchInterval: MARKET_POLL_MS,
  });
}

export function useAutopilotStatusQuery() {
  return useQuery({
    queryKey: ["autopilotStatus"],
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
    queryKey: ["shipTask", shipSymbol],
    queryFn: () => automationService.getShipTask(shipSymbol),
    enabled: !!shipSymbol,
    retry: 1,
    refetchInterval: SHIP_TASK_POLL_MS,
  });
}

// `null` means metrics rollups aren't configured on this deployment (the
// route doesn't exist), not an error — same treatment as useShipTaskQuery's 404.
export function useMetricsContextQuery({ rollupLimit, eventLimit } = {}) {
  return useQuery({
    queryKey: ["metricsContext", rollupLimit, eventLimit],
    queryFn: () => automationService.getMetricsContext({ rollupLimit, eventLimit }),
    refetchInterval: METRICS_CONTEXT_POLL_MS,
  });
}

// `null` means anomaly detection isn't configured (no webhook set) — same
// "feature not enabled" treatment as useMetricsContextQuery.
export function useAnomaliesDigestQuery({ windowMinutes, anomalyLimit, eventLimit } = {}) {
  return useQuery({
    queryKey: ["anomaliesDigest", windowMinutes, anomalyLimit, eventLimit],
    queryFn: () => automationService.getAnomaliesDigest({ windowMinutes, anomalyLimit, eventLimit }),
    refetchInterval: ANOMALIES_DIGEST_POLL_MS,
  });
}
