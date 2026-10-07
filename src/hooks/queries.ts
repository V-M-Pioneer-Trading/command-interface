import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
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
const AUTOPILOT_EVENTS_POLL_MS = 5_000;

// Where a hook below passes its symbol argument to the API through
// `requireSymbol`: the hook also sets `enabled: !!symbol`, so the query function
// only ever runs with a real value. The argument is typed nullable because
// callers pass the selection, which starts out empty.
function requireSymbol(symbol: string | null | undefined): string {
  if (!symbol) throw new Error("query function ran without a symbol; `enabled` should have prevented it");
  return symbol;
}

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
interface GatedQueryOptions<TData, TSelected>
  extends Omit<UseQueryOptions<TData, Error, TSelected>, "queryKey" | "queryFn" | "enabled"> {
  key: () => QueryKey;
  queryFn: (authToken: string | null) => Promise<TData>;
  enabled?: boolean;
}

function useGatedQuery<TData, TSelected = TData>({
  key,
  queryFn,
  enabled = true,
  ...options
}: GatedQueryOptions<TData, TSelected>) {
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

// A null answer means "no list" (agent-service, nil slice): an empty fleet, not
// an unconfigured feature. Normalised here so QueryState reaches the panel's own
// empty state instead of the blank `notConfigured` paragraph.
export function useShipsQuery() {
  return useGatedQuery({
    key: queryKeys.ships,
    queryFn: async (authToken) => (await agentService.getShips(authToken)) ?? [],
    refetchInterval: SHIPS_POLL_MS,
  });
}

export function useContractsQuery() {
  return useGatedQuery({
    key: queryKeys.contracts,
    queryFn: async (authToken) => (await agentService.getContracts(authToken)) ?? [],
    refetchInterval: CONTRACTS_POLL_MS,
  });
}

// Public — navigation-service serves its SQLite cache to anyone; a session,
// when there is one, only extends that to a live fetch-on-miss. So this fires
// for a visitor too, and the map draws before anyone signs in.
export function useSystemWaypointsQuery(systemSymbol: string | null | undefined) {
  const { getToken } = useOperator();
  return useQuery({
    queryKey: queryKeys.systemWaypoints(systemSymbol),
    queryFn: async () => navigationService.getSystemWaypoints(requireSymbol(systemSymbol), await getToken()),

    // `enabled` below means the fn only runs with a symbol.
    enabled: !!systemSymbol,
    staleTime: Infinity,
  });
}

export function useCooldownQuery(
  shipSymbol: string | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useGatedQuery({
    key: () => queryKeys.cooldown(shipSymbol),
    queryFn: (authToken) => fleetService.getCooldown(requireSymbol(shipSymbol), authToken),
    enabled: !!shipSymbol && enabled,
    refetchInterval: COOLDOWN_POLL_MS,
  });
}

export function useCargoQuery(shipSymbol: string | null | undefined) {
  return useGatedQuery({
    key: () => queryKeys.cargo(shipSymbol),
    queryFn: (authToken) => fleetService.getCargo(requireSymbol(shipSymbol), authToken),
    enabled: !!shipSymbol,
    select: (res) => res?.data ?? null,
  });
}

export function useMarketQuery(
  waypointSymbol: string | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { getToken } = useOperator();
  return useQuery({
    queryKey: queryKeys.market(waypointSymbol),
    queryFn: async () => navigationService.getMarket(requireSymbol(waypointSymbol), await getToken()),

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

export function useAutopilotEventsQuery(limit: number) {
  return useQuery({
    queryKey: queryKeys.autopilotEvents(limit),
    queryFn: () => automationService.getEvents(limit),
    refetchInterval: AUTOPILOT_EVENTS_POLL_MS,
  });
}
