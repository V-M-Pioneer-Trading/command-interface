import { nonEmpty } from "../utils/nonEmpty";

export const config = {
  agentServiceUrl: nonEmpty(import.meta.env.VITE_AGENT_SERVICE_URL) ?? "http://localhost:8080/api/agent/v1",
  navigationServiceUrl:
    nonEmpty(import.meta.env.VITE_NAVIGATION_SERVICE_URL) ?? "http://localhost:8081/api/navigation/v1",
  fleetServiceUrl: nonEmpty(import.meta.env.VITE_FLEET_SERVICE_URL) ?? "http://localhost:3001/api/fleet/v1",
  automationServiceUrl:
    nonEmpty(import.meta.env.VITE_AUTOMATION_SERVICE_URL) ?? "http://localhost:3003/api/automation/v1",
  authServiceUrl: nonEmpty(import.meta.env.VITE_AUTH_SERVICE_URL) ?? "http://localhost:8082",
  stGatewayUrl: nonEmpty(import.meta.env.VITE_ST_GATEWAY_URL) ?? "http://localhost:3002",
  aiServiceUrl: nonEmpty(import.meta.env.VITE_AI_SERVICE_URL) ?? "http://localhost:3004",
};
