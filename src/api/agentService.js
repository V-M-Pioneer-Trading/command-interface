import { config } from "./config";
import { request } from "./client";

const base = config.agentServiceUrl;

export const agentService = {
  getCurrentAgent: (token) => request(base, "/current-agent", { token }),
  getAgent: (token) => request(base, "/agent", { token }),
  getShips: (token) => request(base, "/ships", { token }),
  getShip: (token, shipSymbol) => request(base, `/ships/${shipSymbol}`, { token }),
  getContracts: (token) => request(base, "/contracts", { token }),
  getContract: (token, contractId) => request(base, `/contracts/${contractId}`, { token }),
  acceptContract: (token, contractId) =>
    request(base, `/contracts/${contractId}/accept`, { method: "POST", token }),
  fulfillContract: (token, contractId) =>
    request(base, `/contracts/${contractId}/fulfill`, { method: "POST", token }),
};
