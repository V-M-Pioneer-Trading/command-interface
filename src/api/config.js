export const config = {
  agentServiceUrl: import.meta.env.VITE_AGENT_SERVICE_URL || "http://localhost:8080/api/agent/v1",
  navigationServiceUrl:
    import.meta.env.VITE_NAVIGATION_SERVICE_URL || "http://localhost:8081/api/navigation/v1",
  fleetServiceUrl: import.meta.env.VITE_FLEET_SERVICE_URL || "http://localhost:3001/api/fleet/v1",
  automationServiceUrl:
    import.meta.env.VITE_AUTOMATION_SERVICE_URL || "http://localhost:3003/api/automation/v1",
};
