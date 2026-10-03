import { config } from "./config";
import { request } from "./client";
import type {
  CargoResponse,
  CooldownResponse,
  RefuelResponse,
  ShipActionResponse,
  Survey,
  SurveyResponse,
} from "./types";

type AuthToken = string | null;

const base = config.fleetServiceUrl;

// These four bodies can be null: a 204 (fleet-service answers one for a ship
// with no cooldown) reads as null, so their result is typed `| null`.

// One credential: `authToken`, the Clerk session. fleet-service verifies it
// (fleet:control on every mutation, a signed-in operator on the two reads) and
// forwards it to st-gateway, which injects the game token and derives queue
// priority from the session it just verified — auth-design.md decisions 2 and 5.
export const fleetService = {
  orbit: (shipSymbol: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/orbit`, { method: "POST", authToken }),
  dock: (shipSymbol: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/dock`, { method: "POST", authToken }),
  navigate: (shipSymbol: string, waypointSymbol: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/navigate`, {
      method: "POST",
      authToken,
      body: { waypointSymbol },
    }),
  extract: (shipSymbol: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/extract`, { method: "POST", authToken }),
  extractWithSurvey: (shipSymbol: string, survey: Survey, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/extract/survey`, {
      method: "POST",
      authToken,
      body: survey,
    }),
  survey: (shipSymbol: string, authToken: AuthToken) =>
    request<SurveyResponse | null>(base, `/ships/${shipSymbol}/survey`, { method: "POST", authToken }),
  refuel: (shipSymbol: string, authToken: AuthToken) =>
    request<RefuelResponse | null>(base, `/ships/${shipSymbol}/refuel`, { method: "POST", authToken }),
  getCooldown: (shipSymbol: string, authToken: AuthToken) =>
    request<CooldownResponse | null>(base, `/ships/${shipSymbol}/cooldown`, { authToken }),
  getCargo: (shipSymbol: string, authToken: AuthToken) =>
    request<CargoResponse | null>(base, `/ships/${shipSymbol}/cargo`, { authToken }),
  deliverContract: (
    contractId: string,
    shipSymbol: string,
    tradeSymbol: string,
    units: number,
    authToken: AuthToken,
  ) =>
    request<ShipActionResponse>(base, `/contracts/${contractId}/deliver`, {
      method: "POST",
      authToken,
      body: { shipSymbol, tradeSymbol, units },
    }),
  setFlightMode: (shipSymbol: string, flightMode: string, authToken: AuthToken) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/nav`, {
      method: "PATCH",
      authToken,
      body: { flightMode },
    }),
  transferCargo: (
    shipSymbol: string,
    tradeSymbol: string,
    units: number,
    targetShipSymbol: string,
    authToken: AuthToken,
  ) =>
    request<ShipActionResponse>(base, `/ships/${shipSymbol}/transfer`, {
      method: "POST",
      authToken,
      body: { tradeSymbol, units, shipSymbol: targetShipSymbol },
    }),
};
