export const config = {
  agentServiceUrl: import.meta.env.VITE_AGENT_SERVICE_URL || "http://localhost:8080",
  navigationServiceUrl:
    import.meta.env.VITE_NAVIGATION_SERVICE_URL || "http://localhost:8081",
  fleetServiceUrl: import.meta.env.VITE_FLEET_SERVICE_URL || "http://localhost:3001",
};
