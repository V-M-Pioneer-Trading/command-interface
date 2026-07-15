import { config } from "./config";
import { request } from "./client";

const base = config.fleetServiceUrl;

export const fleetService = {
  orbit: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/orbit`, { method: "POST", token }),
  dock: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/dock`, { method: "POST", token }),
  navigate: (token, shipSymbol, waypointSymbol) =>
    request(base, `/ships/${shipSymbol}/navigate`, {
      method: "POST",
      token,
      body: { waypointSymbol },
    }),
  extract: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/extract`, { method: "POST", token }),
  extractWithSurvey: (token, shipSymbol, survey) =>
    request(base, `/ships/${shipSymbol}/extract/survey`, {
      method: "POST",
      token,
      body: survey,
    }),
  survey: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/survey`, { method: "POST", token }),
  refuel: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/refuel`, { method: "POST", token }),
  sell: (token, shipSymbol, symbol, units) =>
    request(base, `/ships/${shipSymbol}/sell`, {
      method: "POST",
      token,
      body: { symbol, units },
    }),
  getCooldown: (token, shipSymbol) =>
    request(base, `/ships/${shipSymbol}/cooldown`, { token }),
  getCargo: (token, shipSymbol) => request(base, `/ships/${shipSymbol}/cargo`, { token }),
  deliverContract: (token, contractId, shipSymbol, tradeSymbol, units) =>
    request(base, `/contracts/${contractId}/deliver`, {
      method: "POST",
      token,
      body: { shipSymbol, tradeSymbol, units },
    }),
};
