import { config } from "./config";
import { serviceClient, unwrap, unwrapOrNull } from "./serviceClient";
import type { components, paths } from "../generated/fleet-service";

type AuthToken = string | null;

// Types keep the spec's schema names. Call sites import them from here.
type Schemas = components["schemas"];
export type Cooldown = Schemas["Cooldown"];
export type ShipSurvey = Schemas["ShipSurvey"];
export type FlightMode = Schemas["PatchNavRequestBody"]["flightMode"];

// Display order. Every value must be a spec flight mode; a mode the spec adds is not shown until listed here.
export const FLIGHT_MODES = ["CRUISE", "BURN", "DRIFT", "STEALTH"] as const satisfies readonly FlightMode[];

const client = serviceClient<paths>(config.fleetServiceUrl);

// One credential: `authToken`, the Clerk session. fleet-service verifies it
// (fleet:control on every mutation, a signed-in operator on the two reads) and
// forwards it to st-gateway, which injects the game token and derives queue
// priority from the session it just verified — auth-design.md decisions 2 and 5.
//
// The spec declares `Authorization` a required header parameter on every
// operation, so it travels in `params.header`, not through `bearer`. The token
// is passed per call and never stored.
function authHeader(authToken: AuthToken) {
  // Boundary: with no Clerk session the spec's "required" does not hold: send
  // no Authorization header at all (never `""`, never `Bearer null`) and let
  // fleet-service answer 401, as it did before the generated client.
  return (authToken ? { Authorization: `Bearer ${authToken}` } : {}) as { Authorization: string };
}

const shipParams = (shipSymbol: string, authToken: AuthToken) => ({
  params: { path: { shipSymbol }, header: authHeader(authToken) },
});

export const fleetService = {
  orbit: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST("/api/fleet/v1/ships/{shipSymbol}/orbit", shipParams(shipSymbol, authToken))),
  dock: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST("/api/fleet/v1/ships/{shipSymbol}/dock", shipParams(shipSymbol, authToken))),
  navigate: (shipSymbol: string, waypointSymbol: string, authToken: AuthToken) =>
    unwrap(
      client.POST("/api/fleet/v1/ships/{shipSymbol}/navigate", {
        ...shipParams(shipSymbol, authToken),
        body: { waypointSymbol },
      }),
    ),
  extract: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST("/api/fleet/v1/ships/{shipSymbol}/extract", shipParams(shipSymbol, authToken))),
  // The survey answer (`ShipSurvey`, open) goes back as the request body
  // (`Survey`, closed `size` enum) unchanged: SpaceTraders checks the survey it
  // issued, so the body stays exactly what fleet-service answered.
  extractWithSurvey: (shipSymbol: string, survey: ShipSurvey, authToken: AuthToken) =>
    unwrap(
      client.POST("/api/fleet/v1/ships/{shipSymbol}/extract/survey", {
        ...shipParams(shipSymbol, authToken),
        // Boundary: `size` is a plain string in the answer and an enum in the
        // request. A field SpaceTraders adds to a survey makes fleet-service
        // reject it (400, `throw-on-extras`), as it did before.
        body: survey as Schemas["Survey"],
      }),
    ),
  survey: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST("/api/fleet/v1/ships/{shipSymbol}/survey", shipParams(shipSymbol, authToken))),
  refuel: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.POST("/api/fleet/v1/ships/{shipSymbol}/refuel", shipParams(shipSymbol, authToken))),
  // A ship with no cooldown answers 204: that is `null`, not a failure.
  getCooldown: (shipSymbol: string, authToken: AuthToken) =>
    unwrapOrNull(client.GET("/api/fleet/v1/ships/{shipSymbol}/cooldown", shipParams(shipSymbol, authToken)), 204),
  getCargo: (shipSymbol: string, authToken: AuthToken) =>
    unwrap(client.GET("/api/fleet/v1/ships/{shipSymbol}/cargo", shipParams(shipSymbol, authToken))),
  deliverContract: (
    contractId: string,
    shipSymbol: string,
    tradeSymbol: string,
    units: number,
    authToken: AuthToken,
  ) =>
    unwrap(
      client.POST("/api/fleet/v1/contracts/{contractId}/deliver", {
        params: { path: { contractId }, header: authHeader(authToken) },
        body: { shipSymbol, tradeSymbol, units },
      }),
    ),
  setFlightMode: (shipSymbol: string, flightMode: FlightMode, authToken: AuthToken) =>
    unwrap(
      client.PATCH("/api/fleet/v1/ships/{shipSymbol}/nav", {
        ...shipParams(shipSymbol, authToken),
        body: { flightMode },
      }),
    ),
  // `shipSymbol` in the body is the *target* ship.
  transferCargo: (
    shipSymbol: string,
    tradeSymbol: string,
    units: number,
    targetShipSymbol: string,
    authToken: AuthToken,
  ) =>
    unwrap(
      client.POST("/api/fleet/v1/ships/{shipSymbol}/transfer", {
        ...shipParams(shipSymbol, authToken),
        body: { tradeSymbol, units, shipSymbol: targetShipSymbol },
      }),
    ),
};
