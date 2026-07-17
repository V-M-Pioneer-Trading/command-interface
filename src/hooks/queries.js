import { useQuery } from "@tanstack/react-query";
import { agentService } from "../api/agentService";
import { navigationService } from "../api/navigationService";
import { fleetService } from "../api/fleetService";

const SHIPS_POLL_MS = 12_000;
const AGENT_POLL_MS = 20_000;
const CONTRACTS_POLL_MS = 30_000;
const COOLDOWN_POLL_MS = 5_000;
const MARKET_POLL_MS = 30_000;

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
